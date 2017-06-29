import React from 'react';

export const PDFViewer = (props) => {
    return (
        <div style={{textAlign: 'center', background: '#525659', height: '100%'}}>
          <embed src={props.data} type="application/pdf" style={{height: '100%', width: '100%'}}></embed>
        </div>
    );
}
