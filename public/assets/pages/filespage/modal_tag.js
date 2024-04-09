import { createElement } from "../../lib/skeleton/index.js";

export default function(render) {
    const $modal = createElement(`
        <div>
          TAG MODAL
        </div>
    `);
    render($modal, ({ id }) => {
        console.log("QUIT", id)
        if (id !== 1) return;
    });
}
