import { toHref, navigate } from "../../lib/skeleton/router.js";
import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { basename, forwardURLParams } from "../../lib/path.js";
import notification from "../../components/notification.js";
import assert from "../../lib/assert.js";
import { AjaxError } from "../../lib/error.js";
import t from "../../locales/index.js";

import { currentPath } from "./helper.js";
import { setPermissions } from "./model_acl.js";
import fscache from "./cache.js";
import { ls as middlewareLs } from "./model_virtual_layer.js";

/*
 * The naive approach would be to make an API call and refresh the screen after an action
 * is made but that give a poor UX. Instead, we rely on 2 layers of caching:
 * - the indexedDB cache that stores the part of the filesystem we've already visited. That way
 *   we can make navigation feel instant by first returning what's in the cache first and only
 *   refresh the screen if our cache is out of date.
 * - the transcient cache which is used whenever the user do something. For example, when creating
 *   a file we have 3 actions being done:
 *   1. a new file is shown in the UI but with a loading spinner
 *   2. the api call is made
 *   3. the new file is being persisted in the screen if the API call is a success
 */

const handleSuccess = (text) => rxjs.tap(() => notification.info(text));
const handleError = rxjs.catchError((err) => {
    notification.error(err);
    throw err;
});
const handleErrorRedirectLogin = rxjs.catchError((err) => {
    if (err instanceof AjaxError && err.err().status === 401) {
        navigate(toHref("/login?next=" + location.pathname + location.hash + location.search));
        return rxjs.EMPTY;
    }
    throw err;
});

const trimDirectorySuffix = (name) => name.replace(new RegExp("/$"), "");

export const touch = (path) => ajax({
    url: withURLParams(`api/files/touch?path=${encodeURIComponent(path)}`),
    method: "POST",
    responseType: "json",
}).pipe(
    handleSuccess(t("A file named '{{VALUE}}' was created", basename(path))),
    handleError,
);

export const mkdir = (path) => ajax({
    url: withURLParams(`api/files/mkdir?path=${encodeURIComponent(path)}`),
    method: "POST",
    responseType: "json",
}).pipe(
    handleSuccess(t("A folder named '{{VALUE}}' was created", basename(trimDirectorySuffix(path)))),
    handleError,
);

export const rm = (...paths) => rxjs.forkJoin(paths.map((path) => ajax({
    url: withURLParams(`api/files/rm?path=${encodeURIComponent(path)}`),
    method: "POST",
    responseType: "json",
}))).pipe(
    handleSuccess(paths.length > 1 ? t("All Done!") : t("The file '{{VALUE}}' was deleted", basename(trimDirectorySuffix(paths[0])))),
    handleError,
);

export const mv = (from, to) => ajax({
    url: withURLParams(`api/files/mv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    method: "POST",
    responseType: "json",
}).pipe(
    handleSuccess(t("The file '{{VALUE}}' was renamed", basename(trimDirectorySuffix(from)))),
    handleError,
);

export const save = (path) => rxjs.of(null).pipe(rxjs.delay(1000));

export const ls = (path) => {
    const lsFromCache = (path) => rxjs.from(fscache().get(path));
    const lsFromHttp = (path) => ajax({
        url: withURLParams(`api/files/ls?path=${encodeURIComponent(path)}`),
        method: "GET",
        responseType: "json",
    }).pipe(
        handleErrorRedirectLogin,
        rxjs.map(({ responseJSON }) => ({
            files: responseJSON.results,
            permissions: responseJSON.permissions,
        })),
        rxjs.tap(({ files, permissions }) => {
            fscache().store(path, { files, permissions });
            hooks.ls.emit({ path, files, permissions });
        }),
    );

    return rxjs.combineLatest(
        lsFromCache(path),
        rxjs.merge(
            rxjs.of(null),
            rxjs.merge(rxjs.of(null), rxjs.fromEvent(window, "keydown").pipe( // "r" shorcut
                rxjs.filter((e) => e.keyCode === 82 && document.activeElement.tagName !== "INPUT"),
            )).pipe(rxjs.switchMap(() => lsFromHttp(path))),
        ),
    ).pipe(
        rxjs.mergeMap(([cache, http]) => {
            if (http) return rxjs.of(http);
            if (cache) return rxjs.of(cache);
            return rxjs.EMPTY;
        }),
        rxjs.distinctUntilChanged((prev, curr) => {
            let refresh = false;
            if (prev.files.length !== curr.files.length) refresh = true;
            else if (JSON.stringify(prev.permissions) !== JSON.stringify(curr.permissions)) refresh = true;
            else {
                for (let i=0; i<curr.files.length; i++) {
                    if (curr.files[i].type !== prev.files[i].type ||
                        curr.files[i].size !== prev.files[i].size ||
                        curr.files[i].name !== prev.files[i].name) {
                        refresh = true;
                        break;
                    }
                }
            }
            return !refresh;
        }),
        rxjs.tap(({ permissions }) => setPermissions(path, permissions)),
        middlewareLs(path),
    );
};

export const search = (term) => ajax({
    url: `api/files/search?path=${encodeURIComponent(currentPath())}&q=${encodeURIComponent(term)}`,
    responseType: "json"
}).pipe(rxjs.map(({ responseJSON }) => ({
    files: responseJSON.results,
})));

class hook {
    constructor() {
        this.list = [];
        this.id = 0;
    }

    listen(fn) {
        if (typeof fn !== "function") assert.fail("hook must be a function");
        const id = this.id;
        this.list.push({ id, fn });
        this.id += 1;
        return () => {
            this.list = this.list.filter((obj) => obj.id !== id);
        }
    }

    emit(data) {
        this.list.map(({ fn }) => fn(data));
    }
}

export const hooks = {
    ls: new hook(),
    mutation: new hook(),
    // ...
    // add hooks on a needed basis
};

const withURLParams = (url) => forwardURLParams(url, ["share"]);
