import React, { useState, useEffect } from "react";

import { NgIf, Icon } from "../../components/";
import "./filedownloader.scss";
import { t } from "../../locales/";

export function FileDownloader({ filename, data }) {
    const [isDownloading, setIsDownloading] = useState(false);
    const onClick = () => {
        document.cookie = "download=yes; path=/; max-age=60;";
        setIsDownloading(true);
    };

    useEffect(() => {
        if(!isDownloading) return;
        const t = setInterval(() => {
            if (/download=yes/.test(document.cookie) === false) {
                setIsDownloading(false);
            }
        }, 250);
        return () => clearInterval(t);
    }, [isDownloading]);

    return (
        <div className="component_filedownloader">
            <div className="download_button">
                <a download={filename} href={data}>
                    <NgIf onClick={onClick} cond={!isDownloading}>
                        { t("DOWNLOAD") }
                    </NgIf>
                </a>
                <NgIf cond={isDownloading}>
                    <Icon name="loading"/>
                </NgIf>
            </div>
        </div>
    );
}
