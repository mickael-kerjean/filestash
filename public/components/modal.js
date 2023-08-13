import { createElement } from "../lib/skeleton/index.js";
import rxjs, { applyMutation } from "../lib/rx.js";
import { animate } from "../lib/animate.js";
import { qs } from "../lib/dom.js";

import { CSS } from "../helpers/loader.js";

let _observables = [];
const effect = (obs) => _observables.push(obs.subscribe());
const free = () => {
    for (let i = 0; i < _observables.length; i++) {
        _observables[i].unsubscribe();
    }
    _observables = [];
};

export default class Modal extends HTMLElement {
    async trigger($node, opts = {}) {
        const { onQuit, leftButton, rightButton } = opts;
        const $modal = createElement(`
<div class="component_modal" id="modal-box">
  <style>${await CSS(import.meta.url, "modal.css")}</style>
  <div>
    <div class="component_popup">
      <div class="popup--content">
        <div class="modal-message" data-bind="body"><!-- MODAL BODY --></div>
      </div>
      <div class="buttons">
        <button type="submit" class="emphasis">OK</button>
      </div>
    </div>
  </div>
</div>`);
        this.replaceChildren($modal);

        // feature: setup the modal body
        effect(rxjs.of([$node]).pipe(
            applyMutation(qs($modal, "[data-bind=\"body\"]"), "appendChild")
        ));

        // feature: closing the modal
        effect(rxjs.merge(
            rxjs.fromEvent($modal, "click").pipe(
                rxjs.filter((e) => e.target.getAttribute("id") === "modal-box")
            ),
            rxjs.fromEvent(window, "keydown").pipe(
                rxjs.filter((e) => e.keyCode === 27)
            )
        ).pipe(
            rxjs.tap(() => typeof onQuit === "function" && onQuit()),
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
                if ($box instanceof HTMLElement) size = $box.offsetHeight;

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

customElements.define("component-modal", Modal);
