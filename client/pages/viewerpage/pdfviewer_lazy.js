import React from "react";
import { Document, Page, pdfjs } from "react-pdf";

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
pdfjs.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/2.6.347/build/pdf.worker.js";

export class PDFJSViewer extends React.Component {
    state = {
        numPages: 0,
    }

    onDocumentLoadSuccess({ numPages }) {
        this.setState({ numPages });
    }

    render(){
        return (
            <Document
              file={this.props.src}
              onLoadSuccess={this.onDocumentLoadSuccess.bind(this)}
              options={{
                  cMapUrl: "/assets/vendor/pdfjs/cmaps/",
                  cMapPacked: true,
              }}>
              {
                Array.from(
                  new Array(this.state.numPages),
                  (el, index) => (
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      width={ window.innerWidth > 850 ? 800 : Math.max(window.innerWidth - 50, 100) }
                    />
                  ),
                )
              }
            </Document>
        );
    }
}
