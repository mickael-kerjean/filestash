import React, { useState, useRef, useEffect } from "react";

import {
    Icon, Input,
} from "../../components/";
import { Tags } from "../../model/";
import { t } from "../../locales/";
import "./tag.scss";

export function TagComponent({ path }) {
    const [DB, setDB] = useState(null);
    const [input, setInput] = useState("");

    useEffect(() => {
        Tags.export().then((db) => {
            setDB(db);
        });
    }, []);

    const onFormSubmit = (e) => {
        if (!DB) return;
        else if(!DB.tags) return;

        e.preventDefault();
        const it = input.trim().toLowerCase();
        if (it === "") return;

        const newDB = {...DB};
        newDB.tags = {};
        newDB.tags[it] = [path];
        Object.keys(DB.tags).forEach((tag) => {
            newDB.tags[tag] = DB.tags[tag];
        });
        setDB(newDB);
        setInput("");
        Tags.import(newDB);
    };
    const onClickTag = (tagName) => {
        if (!DB) return;
        else if(!DB.tags) return;
        console.log("CLICK ON ", tagName, "idx", DB.tags[tagName].indexOf(path));

        const newDB = {...DB};
        if (isTagActive(tagName)) {
            newDB.tags[tagName].splice(DB.tags[tagName].indexOf(path), 1);
        } else {
            newDB.tags[tagName].push(path);
        }
        setDB(newDB);
        Tags.import(newDB);
    };
    const onClickMoveUp = (tagName) => {
        if (!DB) return;
        else if(!DB.tags) return;

        const newDB = {...DB};
        const keys = Object.keys(DB.tags) || [];
        const n = keys.indexOf(tagName);
        if (n === 0) return;

        newDB.tags = {};
        for (let i=0; i<keys.length; i++) {
            if (i === n-1) {
                newDB.tags[keys[i+1]] = DB.tags[keys[i+1]];
            } else if (i === n) {
                newDB.tags[keys[i-1]] = DB.tags[keys[i-1]];
            } else {
                newDB.tags[keys[i]] = DB.tags[keys[i]];
            }
        }
        setDB(newDB);
        Tags.import(newDB);
    };
    const onClickMoveDown = (tagName) => {
        if (!DB) return;
        else if(!DB.tags) return;

        const newDB = {...DB};
        const keys = Object.keys(DB.tags) || [];
        const n = keys.indexOf(tagName);
        if (n === keys.length - 1) return;

        newDB.tags = {};
        for (let i=0; i<keys.length; i++) {
            if (i === n) {
                newDB.tags[keys[i+1]] = DB.tags[keys[i+1]];
            } else if (i === n+1) {
                newDB.tags[keys[i-1]] = DB.tags[keys[i-1]];
            } else {
                newDB.tags[keys[i]] = DB.tags[keys[i]];
            }
        }
        setDB(newDB);
        Tags.import(newDB);
    };
    const onClickRemove = (tagName) => {
        const newDB = {...DB};
        delete newDB.tags[tagName];
        Tags.import(newDB);
        setDB(newDB);
    };

    const isTagActive = (tagName) => {
        if (!DB) return false;
        else if(!DB.tags) return false;
        return DB.tags[tagName].indexOf(path) !== -1;
    }

    const TAGS = DB && Object.keys(DB.tags);
    return (
        <div className="component_tag">
            <form onSubmit={(e) => onFormSubmit(e)}>
                <Input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t("Create a Tag")}
                    autoFocus />
            </form>
            <div className="scroll-y">
            {
                TAGS && TAGS.length > 0 ?
                    Object.keys(DB.tags).map((tag) => (
                        <div key={tag} className={"box no-select" + (isTagActive(tag) ? " active" : "")}>
                            <div onClick={() => onClickTag(tag)}>{ tag } <span className="count">{ (DB.tags[tag] || []).length }</span></div>
                            <Icon name="arrow_top" onClick={() => onClickMoveUp(tag)} />
                            <Icon name="arrow_bottom" onClick={() => onClickMoveDown(tag)} />
                            <Icon name="close" onClick={() => onClickRemove(tag)} />
                        </div>
                    )) : (
                        <div className={"box no-select"}>
                            <div onClick={() => onClickTag(t("Bookmark"))}>{ t("Bookmark") }</div>
                        </div>
                    )
            }
            </div>
        </div>
    );
}
