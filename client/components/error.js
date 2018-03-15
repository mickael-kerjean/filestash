import React from 'react';
import { NgIf } from './';

import "./error.scss";

export const Error = (props) => {
    return (
        <div className="component_error">
          {props.err.message || "Oups something went wrong :/"}
          <NgIf cond={props.err.trace !== undefined} className="trace">
            {JSON.stringify(props.err.trace)}
          </NgIf>
        </div>
    );
}
