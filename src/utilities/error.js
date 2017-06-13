import React from 'react';
import { NgIf } from './';

export const Error = (props) => {
    let style = props.style || {};
    style.textAlign = 'center';
    style.marginTop = '50px';
    style.fontSize = '25px';
    style.fontStyle = 'italic';
    style.fontWeight = 100;
    return (
        <div style={style}>
          {props.err.message || "Oups something went wrong :/"}          
          <NgIf cond={props.err.trace !== undefined} style={{fontSize: '12px', maxWidth: '500px', margin: '10px auto 0 auto'}}>
            {JSON.stringify(props.err.trace)}
          </NgIf>
        </div>
    );
}
