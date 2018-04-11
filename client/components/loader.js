import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import './loader.scss';

export const Loader = (props) => {
    return (
        <ReactCSSTransitionGroup transitionName="loader" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={400}>
          <div className="component_loader">
            <svg width="120px" height="120px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
              <rect x="0" y="0" width="100" height="100" fill="none"></rect>
              <circle cx="50" cy="50" r="40" stroke="rgba(100%,100%,100%,0.679)" fill="none" strokeWidth="10" strokeLinecap="round"></circle>
              <circle cx="50" cy="50" r="40" stroke="#6f6f6f" fill="none" strokeWidth="6" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" dur="2s" repeatCount="indefinite" from="0" to="502"></animate>
                <animate attributeName="stroke-dasharray" dur="2s" repeatCount="indefinite" values="150.6 100.4;1 250;150.6 100.4"></animate>
              </circle>
            </svg>
          </div>
        </ReactCSSTransitionGroup>
    );
};
