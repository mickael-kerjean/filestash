import React from 'react';
import ReactDOM from 'react-dom';
import Router  from './router';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/cache.js').then(function(registration) {
    }).catch(function(error) {
        console.log('ServiceWorker registration failed:', error);
    });
}

window.onload = () => {
  ReactDOM.render(<Router/>, document.getElementById('main'));
};
