import React from 'react';
import ReactDOM from 'react-dom';
import Router  from './router';

import { Config } from "./model/";

import './assets/css/reset.scss';

const $loader = document.querySelector(".index-loader");
const $loader_guy = $loader.querySelector(".guy");
const $loader_particules = $loader.querySelector(".longfazers");

window.addEventListener("DOMContentLoaded", () => {
    const className = 'ontouchstart' in window ? 'touch-yes' : 'touch-no';
    document.body.classList.add(className);

    function render(){
        ReactDOM.render(<Router/>, document.getElementById('main'));
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
        if(!$loader.animate){
            $loader.remove();
            return Promise.resolve();
        }
        const moveTheGuy = () => {
            return new Promise((done) => {
                $loader_guy.animate([
                    { left: "40%", opacity: 1 },
                    { left: "110%", opacity: 0.5 }
                ], {
                    easing: "ease-out",
                    duration: 1000,
                    iterations: 1,
                }).onfinish = () => {
                    done();
                };
            });
        };
        const FadeParticules = () => {
            return new Promise((done) => {
                $loader_particules.animate([
                    { opacity: 1 },
                    { opacity: 0 }
                ], {
                    duration: 500,
                    iterations: 1,
                }).onfinish = () => {
                    $loader_particules.remove();
                    done();
                };
            });
        };

        return Promise.all([moveTheGuy(), FadeParticules()]).then(() => {
            $loader.remove();
        });
    }
    function removeLoader(){
        if($loader) $loader.remove();
        return Promise.resolve();
    }

    Config.refresh().then(() => {
        const timeSinceBoot = new Date() - window.initTime;
        if(timeSinceBoot >= 2000){
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
