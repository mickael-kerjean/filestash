import React from "react";
import ReactDOM from "react-dom";
import Router from "./router";

import { Config, Log } from "./model/";
import { http_get, setup_cache } from "./helpers/";
import load from "little-loader";

import "./assets/css/reset.scss";

(function() {
    Promise.all([
        setup_dom(), setup_translation(), setup_xdg_open(), setup_cache(),
        Config.refresh().then(setup_chromecast),
    ]).then(() => {
        const timeSinceBoot = new Date() - window.initTime;
        if (window.CONFIG.name) document.title = window.CONFIG.name;
        if (timeSinceBoot >= 1500) {
            const timeoutToAvoidFlickering = timeSinceBoot > 2500 ? 0 : 500;
            return waitFor(timeoutToAvoidFlickering)
                .then(removeLoaderWithAnimation)
                .then(render);
        }
        return removeLoader().then(render);
    }).catch((err) => {
        const msg = navigator.onLine === false ? "OFFLINE" : (err.message || "CAN'T LOAD");
        Log.report(msg + " - " + (err && err.message), location.href);
        return removeLoaderWithAnimation().then(() => {
            $error(msg);
        });
    });

    const $loader = document.querySelector("#n-lder");
    function render() {
        ReactDOM.render(
            <Router/>,
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
}());

window.addEventListener("DOMContentLoaded", () => {
    const className = "ontouchstart" in window ? "touch-yes" : "touch-no";
    document.body.classList.add(className);
});

window.onerror = function(msg, url, lineNo, colNo, error) {
    Log.report(msg, url, lineNo, colNo, error);
    $error(msg);
};

function $error(msg) {
    const $code = document.createElement("code");
    $code.style.display = "block";
    $code.style.margin = "20px 0";
    $code.style.fontSize = "1.3rem";
    $code.style.padding = "0 10% 0 10%";
    $code.textContent = msg;

    let $img = document.createElement("img");
    $img.setAttribute("src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABQAQMAAADcLOLWAAAABlBMVEUAAABTU1OoaSf/AAAAAXRSTlMAQObYZgAAAFlJREFUeF69zrERgCAQBdElMqQEOtHSuNIohRIMjfjO6DDmB7jZy5YgySQVYDIakIHD1kBPC9Bra5G2Ans0N7iAcOLF+EHvXySpjSBWCDI/3nIdBDihr8m4AcKdbn96jpAHAAAAAElFTkSuQmCC");
    $img.style.display = "block";
    $img.style.padding = "20vh 10% 0 10%";

    document.body.innerHTML = "";
    document.body.appendChild($img);
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
        load("/overrides/xdg-open.js", () => done());
    });
}

function setup_dom() {
    return new Promise((done) => {
        window.addEventListener("DOMContentLoaded", () => done())
    });
}

function setup_translation() {
    let selectedLanguage = "en";
    switch(navigator.language) {
    case "zh-TW":
        selectedLanguage = "zh_tw";
        break;
    default:
        const userLanguage = navigator.language.split("-")[0];
        const idx = [
            "az", "be", "bg", "ca", "cs", "da", "de", "el", "es", "et",
            "eu", "fi", "fr", "gl", "hr", "hu", "id", "is", "it", "ja",
            "ka", "ko", "lt", "lv", "mn", "nb", "nl", "pl", "pt", "ro",
            "ru", "sk", "sl", "sr", "sv", "th", "tr", "uk", "vi", "zh",
        ].indexOf(navigator.language.split("-")[0]);
        if(idx !== -1) {
            selectedLanguage = userLanguage;
        }
    }

    if (selectedLanguage === "en") {
        return Promise.resolve();
    }
    return http_get("/assets/locales/"+selectedLanguage+".json").then((d) => {
        window.LNG = d;
    });
}

function setup_chromecast() {
    if (!CONFIG.enable_chromecast) {
        return Promise.resolve();
    } else if (typeof window.chrome === undefined) {
        return Promise.resolve();
	} else if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        return Promise.resolve();
    }
    return new Promise((done) => {
        const script = document.createElement("script");
        script.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
        script.onerror = () => done()
        window["__onGCastApiAvailable"] = function(isAvailable) {
            if (isAvailable) cast.framework.CastContext.getInstance().setOptions({
                receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
            });
            done();
        };
        document.head.appendChild(script)
    });
}
