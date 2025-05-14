import { createElement } from "../../../lib/skeleton/index.js";
import rxjs, { effect } from "../../../lib/rx.js";
import { qs } from "../../../lib/dom.js";
import { animate, opacityOut } from "../../../lib/animate.js";
import { loadJS } from "../../../helpers/loader.js";

export default function ({ $img, $page, $menubar }) {
    const $navigation = qs($page, `[data-bind="component_navigation"]`);

    const state = {
        active: false,
        x: null,
        y: null,
        distance: null,
    };
    const distance = ({ touches }) => Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);

    effect(rxjs.fromEvent($img.parentElement, "touchstart").pipe(rxjs.tap((event) => {
        if (event.touches.length < 2) return;
        state.active = true;
        event.preventDefault();
        $img.style.transition = "0.1s ease transform";
        $img.style.transformOrigin = "50% 50%";
        $navigation.classList.add("hidden");

        state.x = (event.touches[0].pageX + event.touches[1].pageX) / 2;
        state.y = (event.touches[0].pageY + event.touches[1].pageY) / 2;
        state.distance = distance(event);
    })));

    effect(rxjs.fromEvent($img.parentElement, "touchmove").pipe(rxjs.tap((event) => {
        if (event.touches.length < 2) return;
        event.preventDefault();

        let scale = distance(event) / state.distance;
        if (scale < 1) scale = 1;
        else if (scale > 20) scale = 20;
        const deltaX = (((event.touches[0].pageX + event.touches[1].pageX) / 2) - state.x) * 2;
        const deltaY = (((event.touches[0].pageY + event.touches[1].pageY) / 2) - state.y) * 2;
        $img.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale})`;
    })));

    effect(rxjs.fromEvent($img.parentElement, "touchend").pipe(rxjs.tap((event) => {
        if (state.active === false) return;
        state.active = true;
        $img.style.transition = "0.3s ease transform";
        $img.style.transform = "";
        $navigation.classList.remove("hidden");
    })));
}
