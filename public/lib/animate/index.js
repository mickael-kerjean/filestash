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

export function transition($node, opts = {}) {
    const {
        timeoutEnter = 250, enter = slideXIn(5),
        timeoutLeave = 50, leave = opacityOut(),
    } = opts;

    // STEP1: setup the CSS for $node
    if ($node.classList.value === "") { // if node has no class, assign a random one
        $node.classList.add((Math.random() + 1).toString(36).substring(2));
    }
    const className = (" " + $node.classList.value).split(" ").join(".");
    let css = "";
    if (timeoutEnter && typeof enter === "function") css += enter(className, timeoutEnter);
    if (timeoutLeave && typeof leave === "function") css += leave(className, timeoutLeave);
    if (css) $node.appendChild(createElement(`<style>${css}</style>`));

    // STEP2: run the animation
    enterAnimation($node, timeoutEnter);
    onDestroy(async () => await leaveAnimation($node, timeoutLeave));
    
    return $node;
}
