import { toHref } from "../lib/skeleton/router.js";
import { loadJS } from "../helpers/loader.js";
import { init as setup_translation } from "../locales/index.js";
import { init as setup_config } from "../model/config.js";
import { init as setup_chromecast } from "../model/chromecast.js";
import { report } from "../helpers/log.js";

export default async function main() {
    try {
        await Promise.all([ // procedure with no outside dependencies
            setup_config(),
            setup_translation(),
            setup_xdg_open(),
            setup_device(),
            setup_blue_death_screen(),
            setup_history(),
            setup_polyfill(),
        ]);

        await Promise.all([ // procedure with dependency on config
            setup_chromecast(),
            setup_title(),
        ]);

        window.dispatchEvent(new window.Event("pagechange"));
    } catch (err) {
        console.error(err);
        const msg = window.navigator.onLine === false ? "OFFLINE" : (err instanceof Error && err.message) || "CAN'T LOAD";
        report(msg, err, location.href);
        $error(msg);
    }
}
main();

function $error(msg) {
    const $code = document.createElement("code");
    $code.style.display = "block";
    $code.style.margin = "20px 0";
    $code.style.fontSize = "1.3rem";
    $code.style.padding = "0 10% 0 10%";
    $code.textContent = msg;

    const $img = document.createElement("img");
    $img.setAttribute("src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABQAQMAAADcLOLWAAAABlBMVEUAAABTU1OoaSf/AAAAAXRSTlMAQObYZgAAAFlJREFUeF69zrERgCAQBdElMqQEOtHSuNIohRIMjfjO6DDmB7jZy5YgySQVYDIakIHD1kBPC9Bra5G2Ans0N7iAcOLF+EHvXySpjSBWCDI/3nIdBDihr8m4AcKdbn96jpAHAAAAAElFTkSuQmCC");
    $img.style.display = "block";
    $img.style.padding = "20vh 10% 0 10%";

    document.body.innerHTML = "";
    document.body.appendChild($img);
    document.body.appendChild($code);
}

/// /////////////////////////////////////////
async function setup_xdg_open() {
    window.overrides = {};
    return loadJS(import.meta.url, toHref("/overrides/xdg-open.js"));
}

async function setup_device() {
    const className = "ontouchstart" in window ? "touch-yes" : "touch-no";
    document.body.classList.add(className);

    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.body.classList.add("dark-mode");
    }
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function(e) {
        e.matches ? document.body.classList.add("dark-mode") : document.body.classList.remove("dark-mode");
    });
}

async function setup_blue_death_screen() {
    window.onerror = function(msg, url, lineNo, colNo, error) {
        report(msg, error, url, lineNo, colNo);
        $error(msg);
        if ("serviceWorker" in navigator) navigator.serviceWorker
            .getRegistrations()
            .then((registrations) => {
                for (const registration of registrations) {
                    registration.unregister();
                }
            });
    };
}

async function setup_history() {
    window.history.replaceState({}, "");
}

async function setup_title() {
    document.title = window.CONFIG["name"] || "Filestash";
}

async function setup_polyfill() {
    if (!("replaceChildren" in document.body)) {
        await loadJS(import.meta.url, "../lib/polyfill.js");
    }
}
