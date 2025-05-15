import rxjs, { effect } from "../../../lib/rx.js";
import { qs } from "../../../lib/dom.js";

export default function ({ $img, $page }) {
    const $navigation = qs($page, `[data-bind="component_navigation"]`);

    initZoomDesktop({ $img, $navigation });
    initZoomMobile({ $img, $navigation });
}

function initZoomMobile({ $img, $navigation }) {
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

function initZoomDesktop({ $img, $navigation }) {
    const params = {
        scale: 1,
        x: 0,
        y: 0,
    };

    $img.style.transformOrigin = "0 0";
    $img.style.transition = "";
    const apply = (transitionTime = null) => {
        if (transitionTime !== null) $img.style.transition = `${transitionTime}ms ease transform`;
        $img.style.transform = `translate(${params.x}px,${params.y}px) scale(${params.scale})`;
    };

    // zoom in / out using either: wheel, double click, keyboard shortcut
    effect(rxjs.merge(
        rxjs.fromEvent($img.parentElement, "dblclick").pipe(
            rxjs.filter((e) => e.target === $img),
            rxjs.map((e) => ({ scale: 2, clientX: e.clientX, clientY: e.clientY })),
        ),
        rxjs.fromEvent($img.parentElement, "wheel", { passive: true }).pipe(
            rxjs.throttleTime(100),
            rxjs.map((e) => ({ scale: Math.exp(-e.deltaY / 300), clientX: e.clientX, clientY: e.clientY })),
        ),
        rxjs.fromEvent(window, "keydown").pipe(
            rxjs.filter(({ key }) => ["Escape", "+", "-", "ArrowUp", "ArrowDown"].indexOf(key) !== -1),
            rxjs.withLatestFrom(rxjs.fromEvent(window, "mousemove").pipe(
                rxjs.startWith({ clientX: null, clientY: null }),
            )),
            rxjs.mergeMap(([{ key }, { clientX, clientY }]) => {
                let scale = 0;
                if (["+", "ArrowUp"].indexOf(key) !== -1) scale = 3/2;
                else if (["-", "ArrowDown"].indexOf(key) !== -1) scale = 2/3;
                return rxjs.of({ clientX, clientY, scale });
            }),
        ),
    ).pipe(rxjs.tap(({ clientX, clientY, scale }) => {
        $navigation.classList.add("hidden");
        const rect = $img.getBoundingClientRect();
        const ox   = clientX !== null ? clientX - rect.left : rect.width / 2;
        const oy   = clientY !== null ? clientY - rect.top : rect.height / 2;
        let ns = params.scale * scale;
        if (ns > 20) return;
        params.x = ns <= 1 ? 0: params.x+(1-scale)*ox;
        params.y = ns <= 1 ? 0: params.y+(1-scale)*oy;
        params.scale = ns < 1 ? 1: ns;
        if (params.scale === 1) $navigation.classList.remove("hidden");
        apply(ns < 1 ? 500: 200);
    })));

    // grab / panning
    effect(rxjs.fromEvent($img.parentElement, "mousedown").pipe(
        rxjs.filter((event) => event.target === $img && event.button === 0 && params.scale > 1),
        rxjs.tap(() => {
            $img.style.cursor = "move";
            $navigation.classList.add("hidden");
        }),
        rxjs.switchMap((event) => rxjs.fromEvent(window, "mousemove").pipe(
            rxjs.pairwise(),
            rxjs.takeUntil(rxjs.fromEvent(window, "mouseup")),
            rxjs.map(([prev, curr]) => {
                const dt = curr.timeStamp - prev.timeStamp;
                const dx = curr.clientX - prev.clientX;
                const dy = curr.clientY - prev.clientY;
                params.x += dx;
                params.y += dy;
                return [dx/dt, dy/dt];
            }),
            rxjs.tap(() => apply(0)),
            rxjs.startWith([0, 0]),
            rxjs.last(),
            rxjs.switchMap(([velocityX, velocityY]) => rxjs.EMPTY.pipe(
                rxjs.finalize(() => $img.style.cursor = "default"),
                rxjs.finalize((a) => {
                    const decay   = 0.8;
                    const frameMs = 16;
                    const stopV   = 0.05;

                    const speed  = Math.hypot(velocityX, velocityY);
                    if (speed < stopV) return;
                    const nFramesTillStop  = Math.ceil(Math.log(stopV / speed) / Math.log(decay));
                    const geosum  = (decay * (1 - Math.pow(decay, nFramesTillStop))) / (1 - decay);
                    params.x += geosum * velocityX * frameMs;
                    params.y += geosum * velocityY * frameMs;
                    $img.style.transition = `transform ${nFramesTillStop * frameMs}ms cubic-bezier(0,0,0,1)`;
                    apply();
                }),
            )),
        )),
    ));
}
