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
        })),
        rxjs.map(({ responseJSON }) => ({ files: responseJSON.results }))
    );
}

// function repeat(element, times) {
//     const result = Array(times);
//     for (let i = 0; i < times; i++) result[i] = element;
//     return result;
// }
