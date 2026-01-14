import { createElement } from "../../lib/skeleton/index.js";
import rxjs from "../../lib/rx.js";
import { getBackendEnabled } from "./ctrl_storage_state.js";

export default async function(render) {
    const connections = await getBackendEnabled().pipe(rxjs.first()).toPromise();
    if (connections.length > 0) return render(createElement(`
        <div id="storage-banner">
            Want to apply configuration preset? Check out the <a class="wavy" href="admin/setup?step=2">configuration wizard</a>
            <style>${CSS}</style>
        </div>
    `));
    render(createElement(`
        <div id="storage-banner">
            First time here? You have 2 options for the initial setup:<br>
            1. Pick a storage below and connect directly with your storage credentials<br>
            2. OR Connect your storage with a separate authentication method. Use the <a class="wavy" href="admin/setup?step=2">configuration wizard</a> presets to get started quickly
            <style>${CSS}</style>
        </div>
    `));
}

const CSS = `
#storage-banner {
    background: var(--surface);
    margin: 20px 0 0 0;
    padding: 15px 20px;
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.8);
    text-align: justify;
}
#storage-banner a {
    color: inherit;
}`;
