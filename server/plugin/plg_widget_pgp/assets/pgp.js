import { createElement } from "../../lib/skeleton/index.js";
import { createModal, MODAL_RIGHT_BUTTON } from "../../components/modal.js";
import notification from "../../components/notification.js";
import { qs, safe } from "../../lib/dom.js";

import * as openpgp from "https://unpkg.com/openpgp@6.3.0/dist/openpgp.min.mjs";

export function isPGPFile(path) {
    return new RegExp(".gpg$").test(path);
}

export async function decode(src) {
    const $page = createElement(`
        <div class="component_pgp">
            <textarea value=""></textarea>
            <style>${CSS}</style>
        </div>
    `);
    $page.querySelector("textarea").value = `gpg --armor --export-secret-keys me@example.com`;
    return new Promise((done) => createModal({ withButtonsRight: "decrypt", withButtonsLeft: "cancel" })($page, async (n) => {
        if (n !== MODAL_RIGHT_BUTTON) return done(src);
        try {
            const res = await fetch(src);
            const encrypted = await res.arrayBuffer();
            const message = await openpgp.readMessage({
                binaryMessage: new Uint8Array(encrypted),
            });
            const privateKey = await openpgp.readPrivateKey({
                armoredKey: qs($page, "textarea").value,
            });
            const { data } = await openpgp.decrypt({
                message,
                decryptionKeys: privateKey,
                format: "binary",
            });
            done(URL.createObjectURL(new Blob([data])));
        } catch (err) {
            notification.error(err);
            done(src);
        } finally {
            $page.remove();
        }
    }));
}

const CSS = `
.component_pgp textarea {
    width: 100%;
    border: none;
    height: 300px;
    font-size: 0.5rem;
}
`;
