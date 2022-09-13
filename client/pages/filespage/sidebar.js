import React, { useState, useEffect } from "react";
import { Icon } from "../../components/";
import { settings_get, settings_put } from "../../helpers/";

import "./sidebar.scss";

export function Sidebar({ path }) {
    const [isOn, setIsOn] = useState(function() {
        const v = settings_get("filespage_show_tree");
        if(typeof v === "boolean") return v;
        return document.body.clientWidth > 1700;
    }());
    const [isDisplayed, setIsDisplayed] = useState(document.body.clientWidth > 1250)

    const onToggleHandler = () => {
        settings_put("filespage_show_tree", !isOn);
        setIsOn(!isOn);
    };

    useEffect(() => {
        const onResizeHandler = () => {
            setIsDisplayed(document.body.clientWidth > 1250);
        };
        window.addEventListener("resize", onResizeHandler);
        return () => {
            window.removeEventListener("resize", onResizeHandler);
        }
    }, []);

    return isDisplayed && (
        <div className={"component_sidebar" + (isOn && " active" || "")}>
            <div className="icon" onClick={onToggleHandler}>
                <Icon name="arrow_right" />
            </div>
            <ul>
                <li><img src={window.sub_folder + "/assets/icons/folder.svg"} />test</li>
                <ul>
                    <li className="active"><img src={window.sub_folder + "/assets/icons/folder.svg"} />level2_1</li>
                    <ul>
                        <li><img src={window.sub_folder + "/assets/icons/folder.svg"} />level2_1</li>
                        <li><img src={window.sub_folder + "/assets/icons/folder.svg"} />level2_2</li>
                    </ul>
                    <li><img src={window.sub_folder + "/assets/icons/folder.svg"} />level2_2</li>
                </ul>
                <li><img src={window.sub_folder + "/assets/icons/folder.svg"} />test</li>
                <li><img src={window.sub_folder + "/assets/icons/folder.svg"} />test2</li>
                <li><img src={window.sub_folder + "/assets/icons/folder.svg"} />test3</li>
                <li><img src={window.sub_folder + "/assets/icons/folder.svg"} />test4</li>
            </ul>
        </div>
    );
}
