import React from 'react';
import './fab.scss';

export const Fab = (props) => {
    return (
        <div className="component_fab" onClick={props.onClick}>
          {props.children}
        </div>
    );
}
