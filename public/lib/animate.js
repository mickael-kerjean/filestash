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

const slideXIn = (dist) => ([
    { transform: `translateX(${dist}px)`, opacity: 0 },
    { transform: `translateX(0)`, opacity: 1 },
]);

const opacityOut = () => ([
    { opacity: 1 },
    { opacity: 0 },
]);

const opacityIn = () => ([
    { opacity: 0 },
    { opacity: 1 },
]);
