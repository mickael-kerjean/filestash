import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

import { setPermissions } from "./model_acl.js";
import fscache from "./cache.js";

/*
 * ls is in the hot path. To make it look faster, we keep a cache of its results locally
 * and refresh the screen twice, a first time with the result of the cache and another time
 * with the fresh data.
 */
export function ls(path) {
    return rxjs.combineLatest(
        lsFromCache(path),
        rxjs.merge(
            rxjs.of(null),
            rxjs.merge(rxjs.of(null), rxjs.fromEvent(window, "keydown").pipe( // "r" shorcut
                rxjs.filter((e) => e.keyCode === 82 && document.activeElement.tagName !== "INPUT"),
            )).pipe(
                rxjs.switchMap(() => lsFromHttp(path)),
                rxjs.tap(({ permissions }) => setPermissions(path, permissions)),
            ),
        )
    ).pipe(rxjs.mergeMap(([cache, http]) => {
        if (http && cache) {
            let shouldRefresh = false;
            if (http.files.length !== cache.files.length) return rxjs.of(http);
            else if (JSON.stringify(http.permissions) !== JSON.stringify(cache.permissions)) return rxjs.of(http);
            for (let i=0; i<http.files.length; i++) {
                if (http.files[i].type !== cache.files[i].type ||
                    http.files[i].name !== cache.files[i].name) {
                    return rxjs.of(http);
                }
            }
        }

        if (http) return rxjs.of(http);
        if (cache) return rxjs.of(cache);
        return rxjs.EMPTY;
    }));
}

function lsFromCache(path) {
    return rxjs.from(fscache().get(path));
}

function lsFromHttp(path) {
    return ajax({
        url: `/api/files/ls?path=${path}`,
        responseType: "json"
    }).pipe(
        // rxjs.delay(1000),
        rxjs.map(({ responseJSON }) => ({
            files: responseJSON.results,
            permissions: responseJSON.permissions,
        })),
        rxjs.tap((data) => fscache().store(path, data)),
    );
}

export function search(term) {
    const path = location.pathname.replace(new RegExp("^/files/"), "/");
    return ajax({
        url: `/api/files/search?path=${path}&q=${term}`,
        responseType: "json"
    }).pipe(rxjs.map(({ responseJSON }) => ({
        files: responseJSON.results,
    })));
}
