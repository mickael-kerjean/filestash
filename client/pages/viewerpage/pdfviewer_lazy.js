import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/esm/Page/AnnotationLayer.css";
pdfjs.GlobalWorkerOptions.workerSrc = "/assets/vendor/node_modules/pdfjs-dist/build/pdf.worker.js";

export function PDFJSViewer({ src }) {
    const [numPages, setNumPages] = useState(0);

    return (
        <Document
            file={src}
            onLoadSuccess={(d) => setNumPages(d["numPages"])}
            options={{
                cMapUrl: "/assets/vendor/node_modules/pdfjs-dist/cmaps/",
                cMapPacked: true,
            }}>
            {
                Array.from(
                    new Array(numPages),
                    (el, index) => (
                        <Page
                            key={`page_${index + 1}`}
                            pageNumber={index + 1}
                            width={
                                window.innerWidth > 850 ?
                                    800 :
                                    Math.max(window.innerWidth - 50, 100)
                            }
                        />
                    ),
                )
            }
        </Document>
    );
}
