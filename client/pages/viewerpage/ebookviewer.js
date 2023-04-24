import React, { useEffect, useState } from "react";
import { MenuBar } from "./menubar";
import { Loader } from "../../components/";

import "./ebookviewer.scss";
import ePub, { Book } from "epubjs";

export function EbookViewer({ filename, data }) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const book = new Book({ replacements: "blobUrl" });
        book.open(data);
        const rendition = book.renderTo("epubjs", {
            width: "100%", height: "100%",
            flow: "scrolled-doc",
        });
        rendition.hooks.render.register(function() {
            setIsLoading(false);
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
            {
                isLoading && (
                    <Loader />
                )
            }
            <div className="ebookviewer_container" id="epubjs"></div>
        </div>
    )
}
