import React, { useEffect } from "react";
import { MenuBar } from "./menubar";
import "./ebookviewer.scss";
import ePub, { Book } from "epubjs";

export function EbookViewer({ filename, data }) {
    useEffect(() => {
        const book = new Book({ replacements: "blobUrl" });
        book.open(data);
        const rendition = book.renderTo("epubjs", {
            width: "100%", height: "100%",
            flow: "scrolled-doc",
        });
        const displayed = rendition.display();
        return () => {
            book.destroy();
            rendition.destroy();
        }
    }, []);
    return (
        <div className="component_ebookviewer">
            <MenuBar title={filename} download={data} />
            <div className="ebookviewer_container" id="epubjs"></div>
        </div>
    )
}
