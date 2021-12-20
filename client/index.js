import React from "react";
import ReactDOM from "react-dom";
import Router from "./router";

import { Config, Log } from "./model/";
import { http_get } from "./helpers/ajax";
import load from "little-loader";

import "./assets/css/reset.scss";

window.addEventListener("DOMContentLoaded", () => {
    const className = "ontouchstart" in window ? "touch-yes" : "touch-no";
    document.body.classList.add(className);

    const $loader = document.querySelector("#n-lder");

    function render() {
        ReactDOM.render(
            <React.StrictMode><Router/></React.StrictMode>,
            document.querySelector("div[role='main']"),
        );
        return Promise.resolve();
    }
    function waitFor(n) {
        return new Promise((done) => {
            window.setTimeout(() => {
                window.requestAnimationFrame(() => done());
            }, n);
        });
    }
    function removeLoaderWithAnimation() {
        if (!$loader) return Promise.resolve();
        $loader.classList.add("done");
        return new Promise((done) => {
            window.setTimeout(() => requestAnimationFrame(done), 500);
        });
    }
    function removeLoader() {
        if ($loader) $loader.remove();
        return Promise.resolve();
    }

    Promise.all([Config.refresh(), setup_xdg_open(), translation()]).then(() => {
        const timeSinceBoot = new Date() - window.initTime;
        if (window.CONFIG.name) document.title = window.CONFIG.name;
        if (timeSinceBoot >= 1500) {
            const timeoutToAvoidFlickering = timeSinceBoot > 2500 ? 0 : 500;
            return waitFor(timeoutToAvoidFlickering)
                .then(removeLoaderWithAnimation)
                .then(render);
        }
        return removeLoader().then(render);
    }).catch((e) => {
        const msg = navigator.onLine === false ? "OFFLINE" : "CAN'T LOAD FILESTASH";
        Log.report(msg + " - " + (e && e.message), location.href);
        return removeLoaderWithAnimation().then(() => {
            $error(msg);
        });
    });
});

window.onerror = function(msg, url, lineNo, colNo, error) {
    Log.report(msg, url, lineNo, colNo, error);
    $error(msg);
};

function $error(msg) {
    const $code = document.createElement("code");
    $code.style.textAlign = "center";
    $code.style.display = "block";
    $code.style.margin = "50px 0";
    $code.style.fontSize = "1.3rem";
    $code.textContent = msg;
    document.body.innerHTML = "";
    document.body.appendChild($code);
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
        if (navigator.userAgent.indexOf("Mozilla/") !== -1 &&
            navigator.userAgent.indexOf("Firefox/") !== -1 &&
            navigator.userAgent.indexOf("Gecko/") !== -1) {
            // Firefox was acting weird with service worker so we disabled it
            // see: https://github.com/mickael-kerjean/filestash/issues/255
            return;
        }
        navigator.serviceWorker.register("/sw_cache.js").catch(function(err) {
            console.error("ServiceWorker registration failed:", err);
        });
    });
}

// server generated frontend overrides
window.overrides = {};
function setup_xdg_open() {
    return new Promise((done, err) => {
        load("/overrides/xdg-open.js", function(error) {
            if (error) return err(error);
            done();
        });
    });
}

function translation() {
    const userLanguage = navigator.language.split("-")[0];
    const selectedLanguage = [
        "az", "be", "bg", "ca", "cs", "da", "de", "el", "es", "et",
        "eu", "fi", "fr", "gl", "hr", "hu", "id", "is", "it", "ja",
        "ka", "ko", "lt", "lv", "mn", "nb", "nl", "pl", "pt", "ro",
        "ru", "sk", "sl", "sr", "sv", "th", "tr", "uk", "vi", "zh",
    ].indexOf(userLanguage) === -1 ? "en" : userLanguage;

    if (selectedLanguage === "en") {
        return Promise.resolve();
    }
    return http_get("/assets/locales/"+selectedLanguage+".json").then((d) => {
        window.LNG = d;
    });
}
