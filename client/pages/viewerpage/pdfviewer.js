import React from 'react';
import { MenuBar } from './menubar';
import "./pdfviewer.scss"

export const PDFViewer = (props) => {
    return (
        <div className="component_pdfviewer">
          <MenuBar title={props.filename} download={props.data} />
          <div className="pdfviewer_container" >
            <embed src={props.data+"#toolbar=0"} type="application/pdf" style={{height: '100%', width: '100%'}}></embed>
          </div>
        </div>
    );
}
