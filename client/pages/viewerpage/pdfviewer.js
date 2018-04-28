import React from 'react';
import { MenuBar } from './menubar';

export const PDFViewer = (props) => {
    return (
        <div style={{height: '100%'}}>
          <MenuBar title={props.filename} download={props.data} />
          <div style={{textAlign: 'center', background: '#525659', height: '100%'}}>
            <embed src={props.data+"#toolbar=0"} type="application/pdf" style={{height: '100%', width: '100%'}}></embed>
          </div>
        </div>

    );
}
