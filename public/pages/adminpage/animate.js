import { transition } from "../../lib/animate/index.js";

export default function($node) {
    return transition($node, {
        timeoutEnter: 200,
        enter: slideYIn(3),
    });
}

export function slideYIn(size) {
    return function(querySelector, t) {
        return `
${querySelector}.enter {
    opacity: 0;
    transform: translateY(${size}px);
}
${querySelector}.enter.enter-active {
    opacity: 1;
    transform: translateY(0);
    transition: all ${t}ms ease;
}`;
    }
}

export function zoomIn(size) {
    return function(querySelector, t) {
        return `
${querySelector}.enter {
    opacity: 0;
    transform: scale(${size});
}
${querySelector}.enter.enter-active {
    opacity: 1;
    transform: scale(1);
    transition: all ${t}ms ease;
}`;
    }
}
