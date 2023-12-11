import { onDestroy } from "../../lib/skeleton/index.js";
import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

const selection$ = new rxjs.BehaviorSubject([]);

onDestroy(() => selection$.next([]));

export function addSelection(name, type) {
    selection$.next(selection$.value.concat({ name, type }));
}

export function clearSelection() {
    selection$.next([]);
}

export function getSelection$() {
    return selection$.asObservable();
}

export function ls() {
    return rxjs.pipe(
        rxjs.mergeMap((path) => ajax({
            url: `/api/files/ls?path=${path}`,
            responseType: "json"
        }).pipe(rxjs.map(({ responseJSON }) => ({
            files: responseJSON.results.sort(sortByDefault),
            path,
        })))),
    );
}

const sortByDefault = (fileA, fileB) => {
    if (fileA.type !== fileB.type) {
        if (fileA.type === "file") return +1;
        return -1;
    }
    // if (fileA.name < fileB.name) {
    //     return -1
    // }
    return 0;
};
