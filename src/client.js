// src/app-client.js
import React from 'react';
import ReactDOM from 'react-dom';
import Router  from './router';

window.onload = () => {
  ReactDOM.render(<Router/>, document.getElementById('main'));
};
