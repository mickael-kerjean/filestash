import React from 'react';
import ReactDOM from 'react-dom';
import Router  from './router';

import { Config, Log } from "./model/";
import load from "little-loader";

import './assets/css/reset.scss';

window.addEventListener("DOMContentLoaded", () => {
    const className = 'ontouchstart' in window ? 'touch-yes' : 'touch-no';
    document.body.classList.add(className);
    window.URL_PREFIX = document.baseURI.slice(window.location.origin.length, -1);

    const $loader = document.querySelector("#n-lder");

    function render(){
        ReactDOM.render(<Router/>, document.querySelector("div[role='main']"));
        return Promise.resolve();
    };
    function waitFor(n){
        return new Promise((done) => {
            window.setTimeout(() => {
                window.requestAnimationFrame(() => done());
            }, n);
        });
    }
    function removeLoaderWithAnimation(){
        if(!$loader) return Promise.resolve();
        $loader.classList.add("done");
        return new Promise((done) => {
            window.setTimeout(() => requestAnimationFrame(done), 500);
        });
    }
    function removeLoader(){
        if($loader) $loader.remove();
        return Promise.resolve();
    }

    Promise.all([Config.refresh(), setup_xdg_open()]).then(() => {
        const timeSinceBoot = new Date() - window.initTime;
        if(timeSinceBoot >= 1500){
            const timeoutToAvoidFlickering = timeSinceBoot > 2500 ? 0 : 500;
            return waitFor(timeoutToAvoidFlickering)
                .then(removeLoaderWithAnimation)
                .then(render);
        }
        return removeLoader().then(render);
    }).catch((e) => {
        const msg = "Couldn't boot Filestash";
        Log.report(msg, location.href);
        return removeLoaderWithAnimation()
    });
});

window.onerror = function (msg, url, lineNo, colNo, error) {
    Log.report(msg, url, lineNo, colNo, error)
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
        navigator.serviceWorker.register("sw_cache.js").catch(function(err){
            console.error("ServiceWorker registration failed:", err);
        });
    });
}

// server generated frontend overrides
window.overrides = {};
function setup_xdg_open(){
    return new Promise((done, err) => {
        load("overrides/xdg-open.js", function(error) {
            if(error) return err(error);
            done()
        });
    });
}
