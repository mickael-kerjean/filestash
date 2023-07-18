import { onDestroy, createElement } from "../skeleton/index.js";
import rxjs from "../rxjs/index.js";
import {
    requestAnimation, enterAnimation, leaveAnimation,
    slideXIn, opacityOut,
} from "./animation.js";

export {
    slideXIn, slideXOut,
    slideYIn, slideYOut,
    opacityIn, opacityOut
} from "./animation.js";

export function animate($node, opts = {}) {
    const { timeoutEnter = 200, timeoutLeave = 100 } = opts;
    return rxjs.of({ $node: $node, timeoutEnter, timeoutLeave });
}

export function CSSTransition(opts = {}) {
    const { enter = slideXIn(3), leave = opacityOut() } = opts;
    return rxjs.pipe(
        rxjs.tap(({$node, timeoutEnter, timeoutLeave}) => {
            if ($node.classList.value === "") { // if node has no class, assign a random one
                $node.classList.add((Math.random() + 1).toString(36).substring(2));
            }
            const className = (" " + $node.classList.value).split(" ").join(".");

            let css = "";
            if (timeoutEnter && typeof enter === "function") css += enter(className, timeoutEnter);
            if (timeoutLeave && typeof leave === "function") css += leave(className, timeoutLeave);
            if (css) $node.appendChild(createElement(`<style>${css}</style>`));
        }),
        rxjs.tap(({$node, timeoutEnter, timeoutLeave}) => {
            if (timeoutEnter && enter) enterAnimation($node, timeoutEnter);
            if (timeoutLeave && leave) onDestroy(async () => {
                await leaveAnimation($node, timeoutLeave);
            });
        }),
    );
}
