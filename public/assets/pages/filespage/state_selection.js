import rxjs from "../../lib/rx.js";
import { onDestroy } from "../../lib/skeleton/index.js";

const selection$ = new rxjs.BehaviorSubject([]);

onDestroy(() => selection$.next([]));

export function addSelection({ shift = false, n = 0 }) {
    const newSelection = selection$.value;
    let alreadyKnown = false;
    for (let i=0; i<newSelection.length; i++) {
        if (newSelection[i].n !== n) {
            continue;
        }
        alreadyKnown = true;
        if (newSelection[i].shift === shift) {
            continue;
        }
        newSelection[i].shift = shift;
        selection$.next(newSelection);
    }

    if (alreadyKnown === false) selection$.next(
        selection$.value
            .concat({ shift, n })
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

export function lengthSelection() {
    const selections = selection$.value;
    let l = 0;
    for (let i=0; i<selections.length; i++) {
        l += selections[i].shift && selections[i-1] ?
            selections[i]["n"] - selections[i-1]["n"] :
            1;
    }
    return l;
}


function isBetween(n, lowerBound, higherBound) {
    return n < higherBound && n > lowerBound;
}
