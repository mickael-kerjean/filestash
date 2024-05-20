import { createElement } from "../../lib/skeleton/index.js";

export default function(render) {
    const $modal = createElement(`
        <div>
            Confirm by typing "remove"
            <form style="margin-top: 10px;">
                <input class="component_input" type="text" autocomplete="new-password" value="">
                <div class="modal-error-message">&nbsp;</div>
            </form>
        </div>
    `);
    render($modal);
}
