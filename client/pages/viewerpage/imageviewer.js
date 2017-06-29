import React from 'react';
import { theme } from '../../utilities/';
import { MenuBar } from './menubar';

export const ImageViewer = (props) => {
    return (
        <div style={{height: '100%'}}>
          <MenuBar title={props.filename} download={props.data} />
          <div style={{textAlign: 'center', background: '#525659', height: 'calc(100% - 34px)', overflow: 'hidden', padding: '20px', boxSizing: 'border-box'}}>
            <img src={props.data} style={{maxHeight: '100%', maxWidth: '100%', minHeight: '100px', background: '#f1f1f1', boxShadow: theme.effects.shadow}} />
          </div>
        </div>
    )
}
