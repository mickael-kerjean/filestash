import { createElement } from "../../lib/skeleton/index.js";
import { extname } from "../../lib/path.js";
import rxjs, { effect, preventDefault } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { MODAL_RIGHT_BUTTON } from "../../components/modal.js";
import t from "../../locales/index.js";

export default function(render, filename) {
    const $modal = createElement(`
        <div>
            ${t("Rename as")}:
            <form style="margin-top: 10px;">
                <input class="component_input" type="text" autocomplete="new-password" value="">
                <div class="modal-error-message"></div>
            </form>
        </div>
    `);
    const ret = new rxjs.Subject();
    const $input = qs($modal, "input");
    const pressOK = render($modal, function (id) {
        const value = $input.value.trim();
        if (id !== MODAL_RIGHT_BUTTON) {
            return;
        } else if (!value || value === filename) {
            qs($modal, ".modal-error-message").textContent = t("Not Valid");
            return ret.toPromise();
        }
        ret.next(value);
        ret.complete();
    }).bind(this, MODAL_RIGHT_BUTTON);

    const ext = extname(filename);
    $input.value = filename;
    $input.focus();
    if (ext === filename) $input.select();
    else $input.setSelectionRange(0, filename.length - ext.length - 1);

    effect(rxjs.fromEvent(qs($modal, "form"), "submit").pipe(
        preventDefault(),
        rxjs.tap(pressOK),
    ));

    return ret.toPromise();
}
