import React, { useState, useEffect } from "react";
import { Card, Button, FormBuilder } from "../../components/";
import {
    settings_get, settings_put, createFormBackend, FormObjToJSON, nop,
} from "../../helpers/";
import { Backend } from "../../model/";
import { t } from "../../locales/";
import "./form.scss";

export function Form({
    onLoadingChange = nop, onError = nop, onSubmit = nop,
}) {
    const [enabledBackends, setEnabledBackends] = useState([]);
    const [selectedTab, setSelectedTab] = useState(function() { // TODO: buggy
        const connLength = window.CONFIG["connections"].length;
        if (connLength < 4) return 0;
        else if (connLength < 5) return 1;
        return 2;
    }());

    useEffect(() => {
        const select = settings_get("login_tab");
        if (select !== null && select < window.CONFIG["connections"].length) {
            setSelectedTab(select);
        }
        Backend.all().then((backend) => {
            onLoadingChange(false);
            setEnabledBackends(window.CONFIG["connections"].reduce((acc, conn) => {
                const f = createFormBackend(backend, conn);
                if (Object.keys(f).length > 0) {
                    acc.push(f);
                }
                return acc;
            }, []));
        }).catch((err) => onError(err));

        return () => {
            settings_put("login_tab", selectedTab);
        };
    }, []);

    const onFormChange = (p) => {
        setEnabledBackends(enabledBackends.map((backend) => (backend)));
    };
    const onSubmitForm = (e) => {
        e.preventDefault();
        const formData = FormObjToJSON((() => {
            const tmp = enabledBackends[selectedTab];
            return tmp[Object.keys(tmp)[0]];
        })());
        delete formData.image;
        delete formData.label;
        delete formData.advanced;
        onSubmit(formData);
    };
    const onTypeChange = (tabn) => {
        setSelectedTab(tabn);
    };

    const renderForm = ($input, props, struct, onChange) => {
        if (struct.type === "image") {
            return (
                <div className="center">
                    { $input }
                </div>
            );
        } else if (struct.enabled === true) {
            return null;
        } else if (struct.label === "advanced") {
            return (
                <label style={{ color: "rgba(0,0,0,0.4)" }}>
                    { $input }
                    { t("Advanced") }
                </label>
            );
        }
        return (
            <label htmlFor={props.params["id"]}
                className={"no-select input_type_" + props.params["type"]}>
                <div>
                    { $input }
                </div>
            </label>
        );
    };

    return (
        <Card style={{ marginTop: `${_centerThis()}px` }}
            className="no-select component_page_connection_form">
            {
                enabledBackends.length > 1 && (
                    <div role="navigation"
                        className={`buttons ${((window.innerWidth < 600) ? "scroll-x" : "")}`}>
                        {
                            enabledBackends.map((backend, i) => {
                                const key = Object.keys(backend)[0];
                                if (!backend[key]) return null; // TODO: this shouldn't be needed
                                return (
                                    <Button
                                        key={`menu-${i}`}
                                        className={i === selectedTab ? "active primary" : ""}
                                        onClick={() => onTypeChange(i)}
                                    >
                                        { backend[key].label.value }
                                    </Button>
                                );
                            })
                        }
                    </div>
                )
            }
            <div>
                <form onSubmit={(e) => onSubmitForm(e)} autoComplete="off" autoCapitalize="off"
                    spellCheck="false" autoCorrect="off">
                    {
                        enabledBackends.map((form, i) => {
                            const key = Object.keys(form)[0];
                            if (!form[key]) return null; // TODO: this shouldn't be needed
                            else if (selectedTab !== i) return null;
                            return (
                                <FormBuilder form={form[key]} onChange={onFormChange} key={"form"+i}
                                    render={renderForm} />
                            );
                        })
                    }
                    <Button theme="emphasis">{ t("CONNECT") }</Button>
                </form>
            </div>
        </Card>
    );
}

const _centerThis = () => {
    let size = 300;
    const $screen = document.querySelector(".login-form");
    if ($screen) size = $screen.offsetHeight;

    size = Math.round((document.body.offsetHeight - size) / 2);
    if (size < 0) return 0;
    if (size > 150) return 150;
    return size;
};
