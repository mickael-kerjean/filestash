import React, { useState, useEffect, useRef } from "react";
import { MenuBar } from "./menubar";
import "./pdfviewer.scss";
import { Bundle, Loader } from "../../components/";

const PDFJSViewer = (props) => (
    <Bundle loader={import(/* webpackChunkName: "pdfjs" */"./pdfviewer_lazy")} symbol="PDFJSViewer">
        {(Comp) => <Comp {...props}/>}
    </Bundle>
);

export function PDFViewer({ filename, data }) {
    const [isLoading, setIsLoading] = useState()
    return (
        <div className="component_pdfviewer">
            <MenuBar title={filename} download={data} />
            <div className="pdfviewer_container">
                {
                    "application/pdf" in navigator.mimeTypes ? (
                        <PDFEmbedViewer src={data} />
                    ) : (
                        <PDFJSViewer src={data} />
                    )
                }
            </div>
        </div>
    );
};

function PDFEmbedViewer({ src }) {
    const $embed = useRef();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!$embed.current) return;
        const onloadHandler = () => {
            setIsLoading(false);
        };
        $embed.current.addEventListener("load", onloadHandler);
        return () => {
            $embed.current.removeEventListener("load", onloadHandler);
        }
    }, [$embed, src]);
    return (
        <React.Fragment>
            { isLoading && ( <Loader /> ) }
            <embed
                ref={$embed}
                src={`${src}#toolbar=0`}
                type="application/pdf"
                style={{ height: "100%", width: "100%" }}
            />
        </React.Fragment>
    );
}
