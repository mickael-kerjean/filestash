import { createElement } from "../../lib/skeleton/index.js";
import { animate, slideYIn } from "../../lib/animate.js";
import rxjs, { effect } from "../../lib/rx.js";
import { CSS } from "../../helpers/loader.js";
import { qs } from "../../lib/dom.js";
import { ApplicationError } from "../../lib/error.js";
import { toggle as toggleLoader } from "../../components/loader.js";
import ctrlError from "../ctrl_error.js";

import { createThing } from "./thing.js";
import { handleError, getFiles } from "./ctrl_filesystem_state.js";
import { ls } from "./model_files.js";

export default async function(render) {
    const $page = createElement(`
        <div class="component_filesystem container">
            <div class="ifscroll-before"></div>
            <div class="list"></div>
            <div class="ifscroll-after"></div>
            <br>
        </div>
    `);
    render($page);

    // feature: virtual scrolling
    const path = location.pathname.replace(new RegExp("^/files"), "");
    effect(rxjs.of(path).pipe(
        toggleLoader($page, true),
        rxjs.mergeMap(() => new Promise((done) => setTimeout(() => done({
            files: new Array(100).fill(1),
        }), 1000))),
        toggleLoader($page, false),
        rxjs.mergeMap(({ files }) => { // STEP1: setup the list of files
            const FILE_HEIGHT = 160;
            // const BLOCK_SIZE = Math.ceil(document.body.clientHeight / FILE_HEIGHT) + 1;
            const BLOCK_SIZE = 10;
            const COLUMN_PER_ROW = 4;
            const VIRTUAL_SCROLL_MINIMUM_TRIGGER = 20;
            let size = files.length;
            if (size > VIRTUAL_SCROLL_MINIMUM_TRIGGER) {
                size = BLOCK_SIZE * COLUMN_PER_ROW;
            }
            const $list = qs($page, ".list");
            const $fs = document.createDocumentFragment();
            for (let i = 0; i < size; i++) {
                $fs.appendChild(createThing({
                    name: `file ${i}`,
                    type: "file",
                    link: "/view/test.txt",
                }));
            }
            animate($list, { time: 200, keyframes: slideYIn(5) });
            $list.appendChild($fs);

            /////////////////////////////////////////
            // CASE 1: virtual scroll isn't enabled
            if (files.length <= VIRTUAL_SCROLL_MINIMUM_TRIGGER) {
                return rxjs.EMPTY;
            }

            /////////////////////////////////////////
            // CASE 2: with virtual scroll
            const $listBefore = qs($page, ".ifscroll-before");
            const $listAfter = qs($page, ".ifscroll-after");
            const height = (Math.ceil(files.length / COLUMN_PER_ROW) - BLOCK_SIZE) * FILE_HEIGHT;
            if (height > 33554400) {
                console.log(`maximum CSS height reached, requested height ${height} is too large`);
            }
            const setHeight = (size) => {
                if (size < 0 || size > height) throw new ApplicationError(
                    "INTERNAL ERROR",
                    `assertion on size failed: size[${size}] height[${height}]`
                );
                $listBefore.style.height = `${size}px`;
                $listAfter.style.height = `${height - size}px`;
            };
            setHeight(0);
            const top = ($node) => $node.getBoundingClientRect().top;
            return rxjs.of({
                files,
                currentState: 0,
                $list,
                setHeight,
                FILE_HEIGHT, BLOCK_SIZE, COLUMN_PER_ROW,
                MARGIN: 35, // TODO: top($list) - top($list.closest(".scroll-y"));
            });
        }),
        rxjs.mergeMap(({
            files,
            BLOCK_SIZE, COLUMN_PER_ROW, FILE_HEIGHT,
            MARGIN,
            currentState,
            height, setHeight,
            $list,
        }) => rxjs.fromEvent($page.closest(".scroll-y"), "scroll", { passive: true }).pipe(
            rxjs.map((e) => {
                // 0-------------0-----------1-----------2-----------3 ....
                //    [padding]     $block1     $block2     $block3    ....
                const nextState = Math.floor((e.target.scrollTop - MARGIN) / FILE_HEIGHT);
                return Math.max(nextState, 0);
            }),
            rxjs.distinctUntilChanged(),
            rxjs.debounce(() => new rxjs.Observable((observer) => {
                const id = requestAnimationFrame(() => observer.next());
                return () => cancelAnimationFrame(id);
            })),
            rxjs.tap((nextState) => {
                // STEP1: calculate the virtual scroll paramameters
                let diff = nextState - currentState;
                const diffSgn = Math.sign(diff);
                if (Math.abs(diff) > BLOCK_SIZE) { // diff is bound by BLOCK_SIZE
                    // we can't be moving more than what is on the screen
                    diff = diffSgn * BLOCK_SIZE;
                }
                let fileStart = nextState * COLUMN_PER_ROW;
                if (diffSgn > 0) { // => scroll down
                    fileStart += BLOCK_SIZE * COLUMN_PER_ROW;
                    fileStart -= Math.min(diff, BLOCK_SIZE) * COLUMN_PER_ROW;
                }
                let fileEnd = fileStart + diffSgn * diff * COLUMN_PER_ROW;
                if (fileStart >= files.length) { // occur when BLOCK_SIZE is larger than its absolute minimum
                    return;
                }
                else if (fileEnd > files.length) {
                    // occur when files.length isn't a multiple of COLUMN_PER_ROW and
                    // we've scrolled to the bottom of the list already
                    nextState = Math.ceil(files.length / COLUMN_PER_ROW) - BLOCK_SIZE;
                    fileEnd = files.length - 1;
                    for (let i=0; i<COLUMN_PER_ROW; i++) {
                        // add some padding to fileEnd to balance the list to the
                        // nearest COLUMN_PER_ROW
                        fileEnd += 1;
                        if (fileEnd % COLUMN_PER_ROW === 0) {
                            break
                        }
                    }
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

                // STEP3: update the DOM
                if (diffSgn > 0) { // scroll down
                    $list.appendChild($fs);
                    for (let i = 0; i < n; i++) $list.firstChild.remove();
                } else { // scroll up
                    $list.insertBefore($fs, $list.firstChild);
                    for (let i = 0; i < n; i++) $list.lastChild.remove();
                }
                setHeight(nextState * FILE_HEIGHT);
                currentState = nextState;
            }),
        )),
        rxjs.catchError(ctrlError()),
    ));
}
