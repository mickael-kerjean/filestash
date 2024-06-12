import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import notification from "../../components/notification.js";

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

const withNotification = rxjs.catchError((err) => {
    notification.error(err);
    throw err;
});

export const touch = (path) => ajax({
    url: `api/files/touch?path=${encodeURIComponent(path)}`,
    method: "POST",
    responseType: "json",
}).pipe(withNotification);

export const mkdir = (path) => ajax({
    url: `api/files/mkdir?path=${encodeURIComponent(path)}`,
    method: "POST",
    responseType: "json",
}).pipe(withNotification);

export const rm = (...paths) => rxjs.forkJoin(paths.map((path) => ajax({
    url: `api/files/rm?path=${encodeURIComponent(path)}`,
    method: "POST",
    responseType: "json",
}).pipe(withNotification)));

export const mv = (from, to) => ajax({
    url: `api/files/mv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    method: "POST",
    responseType: "json",
}).pipe(withNotification);

export const save = (path) => rxjs.of(null).pipe(rxjs.delay(1000));

export const ls = (path) => {
    const lsFromCache = (path) => rxjs.from(fscache().get(path));
    const lsFromHttp = (path) => ajax({
        url: `api/files/ls?path=${encodeURIComponent(path)}`,
        method: "GET",
        responseType: "json",
    }).pipe(
        rxjs.map(({ responseJSON }) => ({
            files: responseJSON.results,
            permissions: responseJSON.permissions,
        })),
        rxjs.tap((data) => fscache().store(path, data)),
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

export const search = (term) => {
    const path = location.pathname.replace(new RegExp("^/files/"), "/");
    return ajax({
        url: `api/files/search?path=${encodeURIComponent(path)}&q=${encodeURIComponent(term)}`,
        responseType: "json"
    }).pipe(rxjs.map(({ responseJSON }) => ({
        files: responseJSON.results,
    })));
};
