import { transition } from "../../lib/animate.js";

export default function($node) {
    return transition($node, {
        timeEnter: 100,
        enter: slideYIn(3),
    });
}

export const slideYIn = (size) => ([
    { opacity: 0, transform: `translateY(${size}px)` },
    { opacity: 1, transform: `translateY(0)`},
]);

export const slideXOut = (size) => ([
    { opacity: 1, transform: `translateX(0)`},
    { opacity: 0, transform: `translateX(${size}px)` },
]);

export const slideXIn = (size) => ([
    { opacity: 0, transform: `translateX(${size}px)`},
    { opacity: 1, transform: `translateX(0)` },
]);

export const zoomIn = (size) => ([
    { opacity: 0, transform: `scale(${size})`},
    { opacity: 1, transform: `scale(1)`},
]);

export const cssHideMenu = `.component_menu_sidebar{transform: translateX(-300px)}`;
