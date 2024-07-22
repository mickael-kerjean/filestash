import { report } from "../helpers/log.js";
import { $error } from "./common.js";

export default async function main() {
    try {
        await Promise.all([
            setup_device(),
            setup_blue_death_screen(),
            setup_history(),
        ]);
        window.dispatchEvent(new window.Event("pagechange"));
    } catch (err) {
        console.error(err);
        const msg = window.navigator.onLine === false ? "OFFLINE" : (err.message || "CAN'T LOAD");
        report("boot::" + msg, err, location.href);
        $error(msg);
    }
}
main();

async function setup_device() {
    const className = "ontouchstart" in window ? "touch-yes" : "touch-no";
    document.body.classList.add(className);
}

async function setup_blue_death_screen() {
    window.onerror = function(msg, url, lineNo, colNo, error) {
        report("boot::" + msg, error, url, lineNo, colNo);
        $error(msg);
    };
}

async function setup_history() {
    window.history.replaceState({}, "");
}
