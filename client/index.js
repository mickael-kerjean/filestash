import React from 'react';
import ReactDOM from 'react-dom';
import Router  from './router';

import './assets/css/reset.scss';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/assets/worker/cache.js').catch(function(error) {
        console.log('ServiceWorker registration failed:', error);
    });
}

window.onload = () => {
    ReactDOM.render(<Router/>, document.getElementById('main'));
};

window.log = function(){console.log.apply(this, arguments)};

window.addEventListener("DOMContentLoaded", () => {
    const className = 'ontouchstart' in window ? 'touch-yes' : 'touch-no';
    document.body.classList.add(className);
});
