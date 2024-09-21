import { createElement } from "../../../lib/skeleton/index.js";

const PERCENT = "85%";

export default async function({ $page }) {
    $page.appendChild(createElement(`
        <style>#map img.leaflet-tile { filter: grayscale(${PERCENT}); }</style>
    `));
}
