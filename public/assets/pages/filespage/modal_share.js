import { createElement } from "../../lib/skeleton/index.js";

export default function(render) {
    const $modal = createElement(`
        <div>
          MODAL SHARE
        </div>
    `);
    render($modal, ({ id }) => {
        if (id !== 1) return;
    });
}
