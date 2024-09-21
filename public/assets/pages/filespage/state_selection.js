import rxjs from "../../lib/rx.js";
import { onDestroy } from "../../lib/skeleton/index.js";
import { extractPath } from "./helper.js";

/*
 * CAUTION: Use a lot of caution if you change this file as it's easy for a bug to slip in and be responsible
 * for someone using selection to delete something and lose some data. We really don't want this to happen!
 *
 * BACKGROUND: There's many way we could have work on the selection. In fact I've made a couple prior attempts
 * with very simple implementations but none of them felt "right" from a user point of view. The approach
 * taken here mimicks the behavior of osx finder. To understand what is going on, I strongly advise you
 * open up osx finder and play with it first.
 *
 * DATA STRUCTURE: The supporting data structure is a list containing 2 kind of elements:
 * - "anchors" which is created when clicking on something with the cmd key
 * - "range" which is when you click somewhere with the expectation it will expand your range
 *   using the shift key
 */
const selection$ = new rxjs.BehaviorSubject([
    // { "type": "anchor", ...  } => user click somewhere and the shift key is NOT pressed
    // { "type": "range", ...   } => ----------------------------------------- pressed
]);

onDestroy(clearSelection);

export function addSelection({ shift = false, n = 0, ...rest }) {
    const selections = selection$.value;
    const selection = { type: shift ? "range" : "anchor", n, ...rest };

    // case1: select a single file/folder
    if (selection.type === "anchor") {
        selection$.next(selections.concat([selection]));
        return;
    }
    // case2: range selection
    const last = selection$.value[selections.length - 1] || { n: 0, type: "anchor" };
    if (last.type === "anchor") {
        selection$.next(selections.concat([selection]));
        return;
    }
    // clear out previous range selector. That's the behavior on apple finder when we do:
    // [A,1] [R,3]             = [A,1] [R,3] => expands to [1,2,3]
    // [A,1] [R,3] [R,8]       = [A,1] [R,8] => expands to [1,2,3,4,5,6,7,8]
    // [A,1] [R,3] [R,8] [R,6] = [A,1] [R,6] => expands to [1,2,3,4,5,6]
    selections[selections.length - 1] = selection;
    selection$.next(selections);
}

export function clearSelection() {
    if (selection$.value.length > 0) selection$.next([]);
}

export function getSelection$() {
    return selection$.asObservable();
}

export function isSelected(n) {
    let isChecked = false;
    const selections = selection$.value;
    for (let i=0; i<selections.length; i++) {
        if (selections[i].type === "anchor" && selections[i].n === n) {
            isChecked = !isChecked;
        }
        else if (selections[i].type === "range" && isBetween(
            n, selections[i-1]?.n || 0, selections[i]?.n,
        )) {
            isChecked = true; // WARNING: change with caution
        }
    }
    return isChecked;
}

export function lengthSelection() {
    return _selectionHelper((set) => set.size);
}

export function expandSelection() {
    return _selectionHelper((set) => {
        const arr = new Array(set.size);
        let i = 0;
        for (const path of set) {
            arr[i] = { path };
            i += 1;
        }
        // console.log(JSON.stringify(arr, null, 2));
        return arr;
    });
}

// This is the core function used to not only calculate the selection length but also expand the
// selection. We're quite slow with an algo running in 3N selection size with room for improvement
// but be very cautious, a bug in here could cause terrible consequence
function _selectionHelper(fn) {
    const set = new Set();
    const selections = selection$.value;
    for (let i=0; i<selections.length; i++) {
        const curr = selections[i];
        if (selections[i].type === "anchor") {
            if (isSelected(selections[i].n)) {
                set.add(curr.path);
            }
            continue;
        }
        const [basepath] = extractPath(curr.path);
        if (!selections[i-1]) {
            for (let j=0; j<=selections[i].n; j++) {
                if (isSelected(j) === false) continue;
                const file = selections[i].files[j];
                set.add(basepath + file.name + (file.type === "directory" ? "/" : ""));
            }
        } else {
            const min = Math.min(selections[i].n, selections[i-1]?.n || 0);
            const max = Math.max(selections[i].n, selections[i-1]?.n || 0);
            for (let j=min; j<=max; j++) {
                if (isSelected(j) === false) continue;
                const file = selections[i].files[j];
                set.add(basepath + file.name + (file.type === "directory" ? "/" : ""));
            }
        }
    }
    return fn(set);
}

function isBetween(n, lowerBound, higherBound) {
    return n <= Math.max(higherBound, lowerBound) && n >= Math.min(lowerBound, higherBound);
}
