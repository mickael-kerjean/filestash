import { createElement, nop } from "../lib/skeleton/index.js";
import rxjs, { applyMutation } from "../lib/rx.js";
import { animate } from "../lib/animate.js";
import { qs, qsa } from "../lib/dom.js";
import { ApplicationError } from "../lib/error.js";
import { CSS } from "../helpers/loader.js";

class Modal {
    static open($node, opts = {}) {
        find().trigger($node, opts);
    }
}

export default Modal

export function createModal(opts) {
    return ($node, ok = nop) => {
        if (ok) opts.onQuit = ok;
        return Modal.open($node, opts);
    };
}

const create = async() => createElement(`
    <div class="component_modal" id="modal-box">
        <style>${await CSS(import.meta.url, "modal.css")}</style>
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
    async trigger($node, opts = {}) {
        const $modal = await create();
        const close$ = new rxjs.Subject();
        const { onQuit = nop, withButtonsLeft = null, withButtonsRight = null } = opts;

        // feature: build the dom
        qs($modal, "[data-bind=\"body\"]").replaceChildren($node);
        this.replaceChildren($modal);
        qsa($modal, ".component_popup > div.buttons > button").forEach(($button, i) => {
            let currentLabel = null;
            if (i === 0) currentLabel = withButtonsLeft;
            else if (i === 1) currentLabel = withButtonsRight;

            if (currentLabel === null) return $button.remove();
            $button.textContent = currentLabel;
            $button.onclick = () => close$.next({ label: currentLabel, id: i+1 });
        });
        effect(rxjs.fromEvent($modal, "click").pipe(
            rxjs.filter((e) => e.target.getAttribute("id") === "modal-box"),
            rxjs.tap(() => close$.next({ id: 0 })),
        ));
        effect(rxjs.fromEvent(window, "keydown").pipe(
            rxjs.filter((e) => e.keyCode === 27),
            rxjs.tap(() => close$.next({ id: 0 })),
        ));

        // feature: closing the modal
        effect(close$.pipe(
            rxjs.tap(onQuit),
            rxjs.tap(() => animate(qs($modal, "div > div"), {
                time: 200,
                keyframes: [
                    { opacity: 1, transform: "translateY(0)" },
                    { opacity: 0, transform: "translateY(20px)" }
                ]
            })),
            rxjs.delay(100),
            rxjs.tap(() => animate($modal, {
                time: 200,
                keyframes: [{ opacity: 1 }, { opacity: 0 }]
            })),
            rxjs.mapTo([]), applyMutation($modal, "remove"),
            rxjs.tap(free)
        ));

        // feature: animate opening
        effect(rxjs.of(["opacity", "0"]).pipe(
            applyMutation(qs($modal, "div > div"), "style", "setProperty"),
            rxjs.tap(() => animate($modal, {
                time: 250,
                keyframes: [
                    { opacity: 0 },
                    { opacity: 1 }
                ]
            })),
            rxjs.delay(50),
            rxjs.tap(() => animate(qs($modal, "div > div"), {
                time: 200,
                keyframes: [
                    { opacity: 0, transform: "translateY(10px)" },
                    { opacity: 1, transform: "translateY(0)" }
                ]
            }))
        ));

        // feature: center horizontally
        effect(rxjs.fromEvent(window, "resize").pipe(
            rxjs.startWith(null),
            rxjs.distinct(() => document.body.offsetHeight),
            rxjs.map(() => {
                let size = 300;
                const $box = document.querySelector("#modal-box > div");
                if ($box instanceof window.HTMLElement) size = $box.offsetHeight;

                size = Math.round((document.body.offsetHeight - size) / 2);
                if (size < 0) return 0;
                if (size > 250) return 250;
                return size;
            }),
            rxjs.map((size) => ["margin", `${size}px auto 0 auto`]),
            applyMutation(qs(this, ".component_modal > div"), "style", "setProperty")
        ));
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

function find() {
    const $dom = document.body.querySelector("component-modal");
    if (!($dom instanceof ModalComponent)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: wrong type modal component");
    return $dom;
}
