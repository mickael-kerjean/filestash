import React from 'react';
import { theme } from './theme';

export const Fab = (props) => {
    let style = {};
    style.height = '25px';
    style.width = '25px';
    style.padding = '13px';
    style.position = 'fixed';
    style.bottom = '20px';
    style.right = '20px';
    style.borderRadius = '50%';
    style.background = theme.colors.text;
    style.boxShadow = theme.effects.shadow; 
    style.zIndex = '1000';
    style.cursor = 'pointer';
    return (
        <div onClick={props.onClick} style={style}>
          {props.children}
        </div>
    )
}
