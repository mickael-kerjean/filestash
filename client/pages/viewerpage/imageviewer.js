import React from 'react';

import { MenuBar } from './menubar';

export const ImageViewer = (props) => {
    return (
        <div style={{height: '100%'}}>
          <MenuBar title={props.filename} download={props.data} />
          <div style={{textAlign: 'center', background: '#525659', height: 'calc(100% - 34px)', overflow: 'hidden', padding: '20px', boxSizing: 'border-box'}}>
            <img src={props.data} style={{maxHeight: '100%', maxWidth: '100%', minHeight: '100px', background: '#f1f1f1', boxShadow: 'rgba(0, 0, 0, 0.14) 0px 4px 5px 0px, rgba(0, 0, 0, 0.12) 0px 1px 10px 0px, rgba(0, 0, 0, 0.2) 0px 2px 4px -1px'}} />
          </div>
        </div>
    )
}
