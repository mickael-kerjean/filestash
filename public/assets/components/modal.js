import { createElement } from "../lib/skeleton/index.js";
import assert from "../lib/assert.js";
import rxjs, { applyMutation } from "../lib/rx.js";
import { animate } from "../lib/animate.js";
import { qs, qsa } from "../lib/dom.js";
import { loadCSS } from "../helpers/loader.js";

export function createModal(opts) {
    const $dom = assert.type(qs(document.body, "component-modal"), window.HTMLElement);
    assert.type($dom, ModalComponent);

    return ($node, fn) => $dom.trigger($node, { onQuit: fn, ...opts });
}

export const MODAL_LEFT_BUTTON = 1;
export const MODAL_RIGHT_BUTTON = 2;
export const MODAL_QUIT = 0;

const $modal = createElement(`
    <div class="component_modal" id="modal-box">
        <div>
            <div class="component_popup">
                <div class="popup--content">
                    <div class="modal-message" data-bind="body"><!-- MODAL BODY --></div>
                </div>
                <div class="buttons">
                    <button type="button"></button>
                    <button type="submit" class="emphasis"></button>
                </div>
            </div>
        </div>
    </div>
`);

class ModalComponent extends window.HTMLElement {
    async connectedCallback() {
        await loadCSS(import.meta.url, "./modal.css");
    }

    trigger($node, { withButtonsLeft = null, withButtonsRight = null, targetHeight = 0, onQuit = (a) => Promise.resolve(a) }) {
        const close$ = new rxjs.Subject();

        // feature: build the dom
        qs($modal, `[data-bind="body"]`).replaceChildren($node);
        this.replaceChildren($modal);
        qsa($modal, ".component_popup > div.buttons > button").forEach(($button, i) => {
            assert.truthy(i >= 0 && i <= 2);
            let currentLabel = null;
            let buttonIndex = null;
            if (i === 0) {
                currentLabel = withButtonsLeft;
                buttonIndex = MODAL_LEFT_BUTTON;
            } else if (i === 1) {
                currentLabel = withButtonsRight;
                buttonIndex = MODAL_RIGHT_BUTTON;
            }

            if (currentLabel !== null) {
                $button.classList.remove("hidden");
                $button.textContent = currentLabel;
                $button.onclick = () => close$.next(buttonIndex);
            } else {
                $button.classList.add("hidden");
            }
        });
        effect(rxjs.fromEvent($modal, "click").pipe(
            rxjs.filter((e) => e.target.getAttribute("id") === "modal-box"),
            rxjs.tap(() => close$.next(MODAL_QUIT)),
        ));
        effect(rxjs.fromEvent(window, "keydown").pipe(
            rxjs.filter((e) => e.keyCode === 27),
            rxjs.tap(() => close$.next(MODAL_QUIT)),
        ));

        // feature: closing the modal
        const $body = () => qs($modal, "div > div");
        effect(close$.pipe(
            rxjs.mergeMap((data) => onQuit(data) || Promise.resolve()),
            rxjs.tap(() => animate($body(), {
                time: 200,
                keyframes: [
                    { opacity: 1, transform: "translateY(0)" },
                    { opacity: 0, transform: "translateY(20px)" },
                ],
            })),
            rxjs.delay(100),
            rxjs.tap(() => animate($modal, {
                time: 200,
                keyframes: [{ opacity: 1 }, { opacity: 0 }],
            })),
            rxjs.mapTo([]), applyMutation($modal, "remove"),
            rxjs.tap(free),
        ));

        // feature: animate opening
        effect(rxjs.of(null).pipe(
            rxjs.tap(() => animate($modal, {
                onEnter: () => $body().style.setProperty("opacity", "0"),
                onExit: () => $body().style.setProperty("opacity", "1"),
                time: 250,
                keyframes: [
                    { opacity: 0 },
                    { opacity: 1 },
                ],
            })),
            rxjs.delay(50),
            rxjs.tap(() => animate($body(), {
                time: 200,
                keyframes: [
                    { opacity: 0, transform: "translateY(10px)" },
                    { opacity: 1, transform: "translateY(0)" },
                ],
            })),
        ));

        // feature: center horizontally
        effect(rxjs.merge(
            rxjs.fromEvent(window, "resize"),
            rxjs.of(null),
        ).pipe(
            rxjs.distinct(() => document.body.offsetHeight),
            rxjs.map(() => {
                let size = targetHeight;
                if (size === null) {
                    const $box = document.querySelector("#modal-box > div");
                    if ($box instanceof window.HTMLElement) size = $box.offsetHeight;
                }
                size = Math.round((document.body.offsetHeight - size) / 2);
                if (size < 0) return 0;
                if (size > 250) return 250;
                return size;
            }),
            rxjs.map((size) => ["margin", `${size}px auto 0 auto`]),
            applyMutation(qs(this, ".component_modal > div"), "style", "setProperty"),
        ));

        return (id) => close$.next(id);
    }
}
customElements.define("component-modal", ModalComponent);

let _observables = [];
const effect = (obs) => _observables.push(obs.subscribe());
const free = () => {
    for (let i = 0; i < _observables.length; i++) {
        _observables[i].unsubscribe();
    }
    _observables = [];
};
