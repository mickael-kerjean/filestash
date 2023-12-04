import { createElement } from "../../lib/skeleton/index.js";
import { animate, slideYIn } from "../../lib/animate.js";
import rxjs, { effect } from "../../lib/rx.js";
import { CSS } from "../../helpers/loader.js";
import { qs } from "../../lib/dom.js";
import { ApplicationError } from "../../lib/error.js";
import { toggle as toggleLoader } from "../../components/loader.js";
import ctrlError from "../ctrl_error.js";

import { createThing, allocateMemory, css } from "./thing.js";
import { handleError, getFiles } from "./ctrl_filesystem_state.js";
import { ls } from "./model_files.js";

export default async function(render) {
    const $page = createElement(`
        <div class="component_filesystem">
            <div class="ifscroll-before">
                <div></div><div></div>
                <div></div><div></div>
            </div>
            <div class="list"></div>
            <div class="ifscroll-after">
                <div></div><div></div>
                <div></div><div></div>
            </div>
            <style>${await css}</style>
            <style>${await CSS(import.meta.url, "ctrl_filesystem.css")}</style>
        </div>
    `);
    render($page);

    // feature: virtual scrolling
    const path = location.pathname.replace(new RegExp("^/files"), "");
    effect(rxjs.of(path).pipe(
        toggleLoader($page, true),
        rxjs.mergeMap(() => new Promise((done) => setTimeout(() => done({
            files: new Array(400).fill(1),
        }), 1000))),
        toggleLoader($page, false),
        rxjs.mergeMap(({ files }) => {
            const BLOCK_SIZE = 8;
            const COLUMN_PER_ROW = 2;
            const FILE_HEIGHT = 160;
            const size = Math.min(files.length, BLOCK_SIZE * COLUMN_PER_ROW);
            allocateMemory(BLOCK_SIZE * COLUMN_PER_ROW);
            const $fs = document.createDocumentFragment();
            for (let i = 0; i < size; i++) {
                $fs.appendChild(createThing({
                    name: `file ${i}`,
                    type: "file",
                    link: "/view/test.txt",
                }));
            }
            const $list = qs($page, ".list");
            const $listBefore = qs($page, ".ifscroll-before");
            const $listAfter = qs($page, ".ifscroll-after");

            const height = (Math.floor(files.length / COLUMN_PER_ROW) - BLOCK_SIZE) * FILE_HEIGHT;
            const setHeight = (size) => {
                $listBefore.style.height = `${size}px`;
                $listAfter.style.height = `${height - size}px`;
            };
            setHeight(0);
            animate($list, { time: 200, keyframes: slideYIn(5) });
            $list.appendChild($fs);
            if (files.length === size) return rxjs.EMPTY;
            return rxjs.of({
                files,
                currentState: 0,
                BLOCK_SIZE, COLUMN_PER_ROW, FILE_HEIGHT,
                setHeight,
                $list,
            });
        }),
        rxjs.mergeMap(({
            files,
            BLOCK_SIZE, COLUMN_PER_ROW, FILE_HEIGHT,
            currentState,
            height, setHeight,
            $list,
        }) => rxjs.fromEvent(
            $page.parentElement.parentElement.parentElement,
            "scroll", { passive: true },
        ).pipe(
            rxjs.map((e) => Math.min(
                Math.ceil(Math.max(0, e.target.scrollTop) / FILE_HEIGHT),
                // cap state value when BLOCK_SIZE is larger than minimum value. This is to
                // prevent issues when scrolling fast to the bottom (aka diff > 1)
                Math.ceil(files.length / COLUMN_PER_ROW) - BLOCK_SIZE,
            )),
            rxjs.distinctUntilChanged(),
            rxjs.debounce(() => new rxjs.Observable((observer) => {
                const id = requestAnimationFrame(() => observer.next());
                return () => cancelAnimationFrame(id);
            })),
            rxjs.tap((nextState) => {
                // STEP1: calculate the virtual scroll paramameters
                let diff = nextState - currentState;
                const diffSgn = Math.sign(diff);
                if (Math.abs(diff) > BLOCK_SIZE) diff = diffSgn * BLOCK_SIZE; // fast scroll
                let fileStart = nextState * COLUMN_PER_ROW;
                if (diffSgn > 0) { // => scroll down
                    // eg: files[15] BLOCK_SIZE=1 COLUMN_PER_ROW=1
                    // -----------[currentState:0]--------------------------[nextState:5]---------
                    // -----------[fileStart=5+1=6]
                    fileStart += BLOCK_SIZE * COLUMN_PER_ROW;
                    // -----------[fileStart=6-min(5,1)=5]
                    fileStart -= Math.min(diff, BLOCK_SIZE) * COLUMN_PER_ROW;
                }
                let fileEnd = fileStart + diffSgn * diff * COLUMN_PER_ROW;

                if (fileStart >= files.length) throw new ApplicationError(
                    "INTERNAL_ERROR",
                    `assert failed in virtual scroll range[${fileStart}:${fileEnd}] length[${files.length}]`,
                ); else if (fileEnd > files.length) {
                    // occur when files.length isn't a multiple of COLUMN_PER_ROW and
                    // we've scrolled to the bottom of the list
                    nextState = Math.floor(files.length / COLUMN_PER_ROW) - BLOCK_SIZE;
                    fileEnd = files.length;
                    do {
                        // add some padding to fileEnd to balance the list to the
                        // nearest COLUMN_PER_ROW
                        fileEnd += 1;
                    } while (fileEnd % COLUMN_PER_ROW !== 0);
                }

                // STEP2: create the new elements
                const $fs = document.createDocumentFragment();
                let n = 0;
                for (let i = fileStart; i < fileEnd; i++) {
                    const file = files[i];
                    if (file === undefined) $fs.appendChild(createThing({
                        name: "dummy",
                    }))
                    else $fs.appendChild(createThing({
                        name: `file - ${i}`,
                        type: "file",
                        link: "/view/test.txt",
                    }));
                    n += 1;
                }
                // console.log(`n[${n}] state[${currentState} -> ${nextState}] files[${fileStart}:${fileEnd}]`)

                // STEP3: update the DOM
                if (diffSgn > 0) { // scroll down
                    // console.log("DOWN", n);
                    // // if (!isInViewport($list.firstChild)) // TODO
                    $list.appendChild($fs);
                    for (let i = 0; i < n; i++) $list.firstChild.remove();
                } else { // scroll up
                    // console.log("UP", n)
                    $list.insertBefore($fs, $list.firstChild);
                    for (let i = 0; i < n; i++) $list.lastChild.remove();
                }
                setHeight(nextState * FILE_HEIGHT);
                currentState = nextState;
            }),
        )),
        rxjs.catchError(ctrlError()),
    ));

    // feature2: fs in "search" mode
    // TODO
}

function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0;
}
