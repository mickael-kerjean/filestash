import { init as initCSS } from "../helpers/loader.js";
import { report } from "../helpers/log.js";
import { $error } from "./common.js";

export default async function main() {
    try {
        await Promise.all([
            setup_device(),
            setup_blue_death_screen(),
            setup_history(),
            setup_css(),
        ]);
        window.dispatchEvent(new window.Event("pagechange"));
    } catch (err) {
        console.error(err);
        const msg = window.navigator.onLine === false ? "OFFLINE" : (err.message || "CAN'T LOAD");
        report(msg + " - " + (err && err.message), location.href);
        $error(msg);
    }
}
main();

async function setup_device() {
    const className = "ontouchstart" in window ? "touch-yes" : "touch-no";
    document.body.classList.add(className);

    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.body.classList.add("dark-mode");
    }
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function(e) {
        e.matches ? document.body.classList.add("dark-mode") : document.body.classList.remove("dark-mode");
    });
}

async function setup_blue_death_screen() {
    window.onerror = function(msg, url, lineNo, colNo, error) {
        report(msg, url, lineNo, colNo, error);
        $error(msg);
    };
}

async function setup_history() {
    window.history.replaceState({}, "");
}

async function setup_css() {
    return initCSS();
}
