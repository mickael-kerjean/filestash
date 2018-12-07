import React from 'react';
import ReactDOM from 'react-dom';
import Router  from './router';

import { Config } from "./model/"

import './assets/css/reset.scss';

window.addEventListener("DOMContentLoaded", () => {
    const className = 'ontouchstart' in window ? 'touch-yes' : 'touch-no';
    document.body.classList.add(className);

    Config.refresh().then(() => {
        ReactDOM.render(<Router/>, document.getElementById('main'));
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/assets/worker/cache.js').catch(function(error) {
            console.log('ServiceWorker registration failed:', error);
        });
    }
});
