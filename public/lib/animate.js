import { onDestroy, createElement } from "./skeleton/index.js";
import rxjs from "./rx.js";

export function transition($node, opts = {}) {
    const {
        timeEnter = 250, enter = slideXIn(5),
        timeLeave = 100, leave = opacityOut(),
    } = opts;
    animate($node, { time: timeEnter, keyframes: enter });
    onDestroy(async () => await animate($node, { time: timeLeave, keyframes: leave }));
    return $node;
}

export function animate($node, opts = {}) {
    let { time = 250, keyframes = opacityIn() } = opts;

    if (!$node) return Promise.resolve();
    else if (typeof $node.animate !== "function") return Promise.resolve();

    return new Promise((done) => {
        const run = $node.animate(keyframes, {
            duration: time,
            fill: "forwards",
        }).onfinish = done;
    });
}

export const slideXIn = (dist) => ([
    { transform: `translateX(${dist}px)`, opacity: 0 },
    { transform: `translateX(0)`, opacity: 1 },
]);

export const slideXOut = (size) => ([
    { opacity: 1, transform: `translateX(0)`},
    { opacity: 0, transform: `translateX(${size}px)` },
]);

export const opacityIn = () => ([
    { opacity: 0 },
    { opacity: 1 },
]);

export const opacityOut = () => ([
    { opacity: 1 },
    { opacity: 0 },
]);

export const slideYIn = (size) => ([
    { opacity: 0, transform: `translateY(${size}px)` },
    { opacity: 1, transform: `translateY(0)`},
]);

export const slideYOut = (size) => ([
    { opacity: 0, transform: `translateY(0px)` },
    { opacity: 1, transform: `translateY(${size}px)`},
]);

export const zoomIn = (size) => ([
    { opacity: 0, transform: `scale(${size})`},
    { opacity: 1, transform: `scale(1)`},
]);
