import React from 'react';
import ReactDOM from 'react-dom';
import Router  from './router';

import { Config } from "./model/";

import './assets/css/reset.scss';

window.addEventListener("DOMContentLoaded", () => {
    const className = 'ontouchstart' in window ? 'touch-yes' : 'touch-no';
    document.body.classList.add(className);

    const $loader = document.querySelector("#n-lder");

    function render(){
        ReactDOM.render(<Router/>, document.getElementById("main"));
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

    Config.refresh().then(() => {
        const timeSinceBoot = new Date() - window.initTime;
        if(timeSinceBoot >= 1500){
            const timeoutToAvoidFlickering = timeSinceBoot > 2500 ? 0 : 500;
            return waitFor(timeoutToAvoidFlickering)
                .then(removeLoaderWithAnimation)
                .then(render);
        }
        return removeLoader().then(render);
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/assets/worker/cache.js').catch(function(error) {
            console.log('ServiceWorker registration failed:', error);
        });
    }
});
