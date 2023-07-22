import { onDestroy, createElement } from "../skeleton/index.js";
import rxjs from "../rxjs/index.js";

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

const sleep = (t) => new Promise((done) => setTimeout(done, t));

function requestAnimation() {
    return new Promise((done) => requestAnimationFrame(done));
}

async function enterAnimation($node, timeout) {
    $node.classList.remove("leave", "leave-active", "enter", "enter-active");
    await requestAnimation();
    $node.classList.add("enter");
    await requestAnimation();
    $node.classList.add("enter-active")
    await sleep(timeout);
    $node.classList.remove("enter", "enter-active");
}

async function leaveAnimation($node, timeout) {
    $node.classList.remove("leave", "leave-active", "enter", "enter-active");
    await requestAnimation();
    $node.classList.add("leave");
    await requestAnimation();
    $node.classList.add("leave-active")
    await sleep(timeout);
}

export function slideXIn(size) {
    return function (querySelector, t){
        return `
${querySelector}.enter {
    opacity: 0;
    transform: translateX(${size}px);
}
${querySelector}.enter.enter-active {
    opacity: 1;
    transform: translateX(0);
    transition: all ${t}ms ease;
}`;
    }
}

export function opacityOut() {
    return function (querySelector, t){
        return `
${querySelector}.leave {
    opacity: 1;
}
${querySelector}.leave.leave-active {
    opacity: 0;
    transition: opacity ${t}ms ease;
}`;
    }
}
