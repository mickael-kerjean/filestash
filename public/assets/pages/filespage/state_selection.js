import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { onDestroy } from "../../lib/skeleton/index.js";

const selection$ = new rxjs.BehaviorSubject([]);

onDestroy(() => selection$.next([]));

export function addSelection({ name, type, shift, n }) {
    selection$.next(
        selection$.value
            .concat({ name, type, shift, n })
            .sort((prev, curr) => prev.n - curr.n)
    );
}

export function clearSelection() {
    selection$.next([]);
}

export function getSelection$() {
    return selection$.asObservable();
}

export function isSelected(n) {
    let isChecked = false;
    for (let i=0;i<selection$.value.length;i++) {
        if (selection$.value[i]["n"] === n) isChecked = !isChecked;
        else if (selection$.value[i]["shift"]
                 && isBetween(n, selection$.value[i-1]["n"], selection$.value[i]["n"]))
            isChecked = !isChecked
    }
    return isChecked;
}

function isBetween(n, lowerBound, higherBound) {
    return n <= higherBound && n >= lowerBound;
}
