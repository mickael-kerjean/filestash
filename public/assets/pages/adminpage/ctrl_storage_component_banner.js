import { createElement } from "../../lib/skeleton/index.js";
import rxjs from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { settingsGet, settingsSave } from "../../lib/store.js";
import { getBackendEnabled } from "./ctrl_storage_state.js";

export default async function(render) {
    const { storage_banner } = settingsGet({ storage_banner: true }, "admin");
    if (!storage_banner) return;
    const connections = await getBackendEnabled().pipe(rxjs.first()).toPromise();
    if (connections.length > 0) return render(withClose(createElement(`
        <div id="storage-banner">
            <span class="no-select pointer" id="close">X</span>
            Want to apply configuration preset? Check out the <a class="wavy" href="admin/setup?step=2">configuration wizard</a>
            <style>${CSS}</style>
        </div>
    `)));
    render(withClose(createElement(`
        <div id="storage-banner">
            <span class="no-select pointer" id="close">X</span>
            First time here? You have 2 options for the initial setup:<br>
            1. Pick a storage below and connect directly with your storage credentials<br>
            2. OR Connect your storage with a separate authentication method. Use the <a class="wavy" href="admin/setup?step=2">configuration wizard</a> presets to get started quickly
            <style>${CSS}</style>
        </div>
    `)));
}

function withClose($el) {
    qs($el, "#close").onclick = () => {
        settingsSave({ storage_banner: false }, "admin");
        $el.remove();
    };
    return $el;
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
}
#storage-banner #close {
    font-family: monospace;
    cursor: pointer;
    text-shadow: 0 0 black;
    float: right;
    padding: 5px;
    margin-right: -5px;
}`;
