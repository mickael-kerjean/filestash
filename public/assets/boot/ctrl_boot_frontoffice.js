import { toHref } from "../lib/skeleton/router.js";
import { loadJS } from "../helpers/loader.js";
import { init as setup_translation } from "../locales/index.js";
import { init as setup_config } from "../model/config.js";
import { init as setup_plugin } from "../model/plugin.js";
import { init as setup_chromecast } from "../model/chromecast.js";
import { report } from "../helpers/log.js";
import { $error } from "./common.js";

export default async function main() {
    try {
        await Promise.all([
            setup_config().then((config) => Promise.all([
                setup_chromecast(config),
                setup_title(config),
                window.self === window.top ? verify_origin(config) : verify_iframe_origin(config),
            ])),
            setup_translation(),
            setup_xdg_open(),
            setup_device(),
            setup_blue_death_screen(),
            setup_history(),
            setup_polyfill(),
            setup_plugin(),
        ]);
        window.dispatchEvent(new window.Event("pagechange"));
    } catch (err) {
        console.error(err);
        const msg = window.navigator.onLine === false ? "OFFLINE" : (err instanceof Error && err.message) || "CAN'T LOAD";
        report(msg, err, location.href);
        $error(msg);
    }
}
await main();

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

async function setup_title(config) {
    document.title = config["name"] || "Filestash";
}

async function setup_polyfill() {
    if (!("replaceChildren" in document.body)) {
        await loadJS(import.meta.url, "../lib/polyfill.js");
    }
}

async function verify_origin(config) {
    const origin = config["origin"];

    // happy path
    if (!origin) return;
    else if (location.origin === origin) return;

    // non happy path
    const u = new URL(origin);
    if (u.host === location.host) return;
    else if (u.hostname === location.hostname) return;

    setTimeout(() => {
        location.href = origin + location.pathname + location.search;
    }, 1000);
    throw new Error("Redirecting to " + origin);
}

async function verify_iframe_origin(_) {
    // TODO: const origin = document.location.ancestorOrigins[0]
    // should we verify iframe origin client side on top of frame ancestor? Until prooven wrong, no.
}
