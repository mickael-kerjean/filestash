import { transition, slideYIn } from "../../lib/animate.js";

export default function($node) {
    return transition($node, {
        timeEnter: 100,
        enter: slideYIn(3)
    });
}

export const cssHideMenu = ".component_menu_sidebar{transform: translateX(-300px)}";
