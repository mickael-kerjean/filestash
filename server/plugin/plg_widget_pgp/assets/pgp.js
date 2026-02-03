import { createElement, onDestroy } from "../../lib/skeleton/index.js";
import { createModal, MODAL_RIGHT_BUTTON } from "../../components/modal.js";
import notification from "../../components/notification.js";
import { qs, safe } from "../../lib/dom.js";

import { getFilename } from "./common.js";

import * as openpgp from "https://unpkg.com/openpgp@6.3.0/dist/openpgp.min.mjs";

let KEY = null;
onDestroy(() => KEY = null);

export function isPGPFile(path) {
    return new RegExp(".gpg$").test(path);
}

export async function decode(src) {
    const $page = createElement(`
        <div class="component_pgp">
            <input type="file" accept=".key" />
            <style>${CSS}</style>
        </div>
    `);
    const encrypted = await new Promise(async (done, error) => {
        try {
            const res = await fetch(src);
            done(await res.arrayBuffer());
        } catch (err) {
            error(err);
        }
    });
    if (encrypted.byteLength === 0) {
        return URL.createObjectURL(new Blob([encrypted]));
    }
    return new Promise((done) => createModal({ withButtonsRight: "decrypt", withButtonsLeft: "cancel" })($page, async (n) => {
        if (n !== MODAL_RIGHT_BUTTON) return done(src);
        try {
            const file = qs($page, "input").files?.[0];
            if (!file) throw new Error("Missing Key");
            const privateKey = await openpgp.readPrivateKey({
                armoredKey: await file.text(),
            });
            KEY = privateKey;
            const { data } = await openpgp.decrypt({
                message: await openpgp.readMessage({
                    binaryMessage: new Uint8Array(encrypted),
                }),
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

export async function encode(data) {
    const $page = createElement(`
        <div class="component_pgp">
            <input type="file" accept=".key" />
            <style>${CSS}</style>
        </div>
    `);
    if (KEY === null) KEY = await new Promise((done, error) => {
        createModal({ withButtonsRight: "encrypt", withButtonsLeft: "cancel" })($page, async (n) => {
            if (n !== MODAL_RIGHT_BUTTON) return error(new Error("missing key"));
            try {
                const file = qs($page, "input").files?.[0];
                if (!file) return done(null);
                const text = await file.text();
                done(await openpgp.readPrivateKey({
                    armoredKey: text,
                }));
            } catch (err) {
                if (err.message !== "Misformed armored text") {
                    notification.error(err);
                    error(err);
                    return
                }
                done(null);
            } finally {
                $page.remove();
            }
        });
    });
    if (KEY === null) try {
        const { privateKey, publicKey } = await openpgp.generateKey({
            type: "rsa",
            rsaBits: 2048,
            userIDs: [{ name: "anonymous", email: "anomymous@local" }],
            format: "armored",
        });
        KEY = await openpgp.readPrivateKey({
            armoredKey: privateKey,
        });
        const $link = document.body.appendChild(Object.assign(document.createElement("a"), {
            href: URL.createObjectURL(new Blob([privateKey], { type: "application/pgp-keys" })),
            download: getFilename() + ".key",
        }));
        $link.click();
        $link.remove();
    } catch (err) {
        return error(err);
    }

    const message = await openpgp.createMessage({
        text: data,
    });
    const encrypted = await openpgp.encrypt({
        message,
        encryptionKeys: KEY.toPublic(),
        format: "binary",
        config: { minRSABits: 1024 },
    });
    return new Blob([encrypted]);
}

const CSS = `
.component_pgp textarea {
    width: 100%;
    border: none;
    height: 200px;
    font-size: 0.5rem;
}
`;
