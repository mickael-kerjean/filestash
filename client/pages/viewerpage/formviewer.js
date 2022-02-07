import React, { useState } from "react";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";

import { MenuBar } from "./menubar";
import { Container, FormBuilder, NgIf, Icon, Fab } from "../../components/";
import { appendShareToUrl } from "../../helpers/";
import "./formviewer.scss";

export function FormViewer({
    filename, data, content,
    needSaving, isSaving, needSavingUpdate, onSave,
}) {
    const [form, setForm] = useState(JSON.parse(content));

    const onFormChange = () => {
        JSON.stringify(form) === content ? needSavingUpdate(false) : needSavingUpdate(true);
    };

    const onClickSave = () => {
        if (needSaving === false) return;
        const blob = new window.Blob([
            JSON.stringify(form),
        ], { type: "text/plain" });
        return onSave(blob).then(() => needSavingUpdate(false));
    };

    const simpleMarkdown = (text) => {
        const regLink = /\[([^\]]*)\]\(([^\)]+)\)/g;
        return text
            .replace(regLink, function(str) {
                const label = str.replace(regLink, "$1");
                const link = str.replace(regLink, "$2");
                return "["+label+"]("+appendShareToUrl(link)+")";
            })
            .replace(regLink, "<a href=\"$2\">$1</a>")
            .replace(/\n/g, "<br>");
    };

    const beautify = (label) => {
        return label
            .split("_")
            .map((t) => {
                if (t.length === 0) return t;
                else if (/[gu]?u?id/.test(t.toLowerCase())) return t.toUpperCase();
                return t[0].toUpperCase() + t.substring(1);
            })
            .join(" ");
    };

    const renderForm = ($input, props, struct, onChange) => {
        return (
            <label className={"no-select"}>
                <div>
                    <span>
                        {
                            beautify(struct.label)
                        }<span className="mandatory">{struct.required ? "*" : ""}</span>
                    </span>
                    <div style={{ width: "100%" }}>
                        { $input }
                    </div>
                </div>
                <div>
                    <span className="nothing"></span>
                    <div style={{ width: "100%" }}>
                        {
                            struct.description ? (
                                <div
                                    className="description"
                                    dangerouslySetInnerHTML={{
                                        __html: simpleMarkdown(struct.description),
                                    }}
                                />
                            ) : null
                        }
                    </div>
                </div>
            </label>
        );
    };

    return (
        <div className="component_formviewer">
            <MenuBar title={filename} download={data} />
            <div className="formviewer_container">
                <Container>
                    <form className="sticky box">
                        <FormBuilder
                            form={form}
                            onChange={onFormChange}
                            render={renderForm}
                        />
                    </form>
                </Container>
                <ReactCSSTransitionGroup
                    transitionName="fab" transitionLeave={true} transitionEnter={true}
                    transitionAppear={true} transitionAppearTimeout={400}
                    transitionEnterTimeout={400} transitionLeaveTimeout={200}>
                    <NgIf key={needSaving} cond={needSaving}>
                        <NgIf cond={!isSaving}>
                            <Fab onClick={onClickSave}>
                                <Icon
                                    name="save"
                                    style={{ height: "100%", width: "100%" }}
                                />
                            </Fab>
                        </NgIf>
                        <NgIf cond={isSaving}>
                            <Fab>
                                <Icon
                                    name="loading"
                                    style={{ height: "100%", width: "100%" }}
                                />
                            </Fab>
                        </NgIf>
                    </NgIf>
                </ReactCSSTransitionGroup>
            </div>
        </div>
    );
}
