import React from "react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { Document, Page, pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/build/pdf.worker.min.js";

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
              }}
            >
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
