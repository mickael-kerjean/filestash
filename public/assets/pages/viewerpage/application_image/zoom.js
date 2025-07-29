import rxjs, { effect } from "../../../lib/rx.js";
import { qs } from "../../../lib/dom.js";

export default function({ $img, $page }) {
    const $navigation = qs($page, `[data-bind="component_navigation"]`);

    effect(rxjs.merge(...builder({ $img })).pipe(
        rxjs.tap(() => $navigation.classList.add("hidden")),
        rxjs.scan((state, { clientX, clientY, moveX, moveY, scale, duration }) => {
            state.x += moveX ?? 0;
            state.y += moveY ?? 0;
            const next = Math.min(20, Math.max(1, state.scale * (scale ?? 1)));
            if (next > 1) {
                const rect = $img.getBoundingClientRect();
                const ox = (clientX ?? rect.left + rect.width / 2) - rect.left;
                const oy = (clientY ?? rect.top + rect.height / 2) - rect.top;
                const f = next / state.scale;
                state.x += (1 - f) * ox;
                state.y += (1 - f) * oy;
            } else {
                state.x = 0;
                state.y = 0;
            }
            state.scale = next;
            state.duration = duration ?? (next === 1 ? 500 : 0);
            return state;
        }, { scale: 1, x: 0, y: 0, duration: 0 }),
        rxjs.tap(({ scale, x, y, duration }) => {
            $img.style.transition = `transform ${duration}ms ease`;
            $img.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
            if (scale === 1) $navigation.classList.remove("hidden");
        }),
    ));
}

function builder({ $img }) {
    $img.style.transformOrigin = "0 0";
    $img.style.transition = "";

    return [
        // zoom via double click
        rxjs.fromEvent($img.parentElement, "dblclick").pipe(
            rxjs.filter((e) => e.target === $img),
            rxjs.map((e) => ({ scale: 2, clientX: e.clientX, clientY: e.clientY })),
        ),
        // zoom via scroll wheel
        rxjs.fromEvent($img.parentElement, "wheel").pipe(
            rxjs.tap((e) => e.preventDefault()),
            rxjs.map((event) => {
                let scale = Math.exp(-event.deltaY / 300);
                if (scale > 1.07) scale = 1.07;
                else if (scale < 0.93) scale = 0.93;
                return {
                    scale,
                    clientX: event.clientX,
                    clientY: event.clientY,
                };
            }),
        ),
        // zoom via keyboard shortcut
        rxjs.fromEvent(window, "keydown").pipe(
            rxjs.filter(({ key }) => ["Escape", "+", "-", "ArrowUp", "ArrowDown"].indexOf(key) !== -1),
            rxjs.withLatestFrom(rxjs.fromEvent(window, "mousemove").pipe(
                rxjs.startWith({ clientX: null, clientY: null }),
            )),
            rxjs.map(([{ key }, { clientX, clientY }]) => {
                let scale = 0;
                if (["+", "ArrowUp"].indexOf(key) !== -1) scale = 3/2;
                else if (["-", "ArrowDown"].indexOf(key) !== -1) scale = 2/3;
                return { clientX, clientY, scale, duration: 100 };
            }),
        ),
        // pinch zoom
        rxjs.fromEvent($img.parentElement, "touchstart", { passive: false }).pipe(
            rxjs.filter((e) => e.touches.length === 2),
            rxjs.switchMap((event) => rxjs.fromEvent($img.parentElement, "touchmove").pipe(
                rxjs.filter((event) => event.touches.length >= 2),
                rxjs.tap((event) => event.preventDefault()),
                rxjs.takeUntil(rxjs.fromEvent(window, "touchend")),
                rxjs.map((event) => ({
                    clientX: (event.touches[0].pageX + event.touches[1].pageX) / 2,
                    clientY: (event.touches[0].pageY + event.touches[1].pageY) / 2,
                    distance: Math.hypot(
                        event.touches[0].pageX - event.touches[1].pageX,
                        event.touches[0].pageY - event.touches[1].pageY,
                    ),
                })),
                rxjs.pairwise(),
                rxjs.map(([curr, prev]) => ({
                    clientX: curr.clientX,
                    clientY: curr.clientY,
                    scale: Math.sign(curr.distance - prev.distance) === 1 ? 0.95 : 1.025,
                    moveX: prev.clientX - curr.clientX,
                    moveY: prev.clientY - curr.clientY,
                    duration: 0,
                })),
            )),
        ),
        // grab and drag
        rxjs.fromEvent($img.parentElement, "mousedown").pipe(
            rxjs.filter((e) => e.target === $img && e.button === 0),
            rxjs.switchMap((down) => {
                let prev = { x: down.clientX, y: down.clientY, t: down.timeStamp };
                const move$ = rxjs.fromEvent(window, "mousemove").pipe(
                    rxjs.takeUntil(rxjs.fromEvent(window, "mouseup")),
                    rxjs.map((m) => {
                        const dx = m.clientX - prev.x;
                        const dy = m.clientY - prev.y;
                        const dt = m.timeStamp - prev.t || 1;
                        prev = { x: m.clientX, y: m.clientY, t: m.timeStamp };
                        return { moveX: dx, moveY: dy, dt, duration: 0 };
                    }),
                    rxjs.tap(() => ($img.style.cursor = "move")),
                    rxjs.share(),
                );
                const $inertia = move$.pipe(
                    rxjs.startWith({ moveX: 0, moveY: 0, dt: 1 }),
                    rxjs.last(),
                    rxjs.tap(() => ($img.style.cursor = "default")),
                    rxjs.switchMap(({ moveX, moveY, dt }) => {
                        const DECAY = 0.8;
                        const FRAME = 16;
                        const STOPV = 0.05;
                        const vx = moveX / dt;
                        const vy = moveY / dt;
                        const speed = Math.hypot(vx, vy);
                        if (speed < STOPV) return rxjs.EMPTY;
                        const nFrames = Math.ceil(Math.log(STOPV / speed) / Math.log(DECAY));
                        const gsum = (DECAY * (1 - Math.pow(DECAY, nFrames))) / (1 - DECAY);
                        return rxjs.of({
                            moveX: vx * gsum * FRAME,
                            moveY: vy * gsum * FRAME,
                            duration: nFrames * FRAME
                        });
                    }),
                );
                return rxjs.merge(move$, $inertia);
            }),
        ),
    ];
}
