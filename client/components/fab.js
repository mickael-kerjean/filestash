import React from 'react';

import './fab.scss';

export const Fab = (props) => {
    return (
        <div className="component_fab" onClick={props.onClick}>
            <div className="content">
              {props.children}
            </div>
        </div>
    );
}
