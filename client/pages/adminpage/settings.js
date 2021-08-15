import React, { useState, useEffect } from "react";
import { FormBuilder } from "../../components/";
import { Config } from "../../model/";
import { format, notify, nop }  from "../../helpers";
import { t } from "../../locales/";

export function SettingsPage({ isSaving = nop }) {
    const [form, setForm] = useState({});
    const format = (name) => {
        if(typeof name !== "string"){
            return "N/A";
        }
        return name
            .split("_")
            .map((word) => {
                if(word.length < 1){
                    return word;
                }
                return word[0].toUpperCase() + word.substring(1);
            })
            .join(" ");
    }
    const onChange = (_form) => {
        _form.connections = window.CONFIG.connections;
        delete _form.constant;
        refresh(Math.random())
        isSaving(true)
        Config.save(_form, true, () => {
            isSaving(false)
        }, (err) => {
            isSaving(false)
            notify.send(err && err.message || t("Oops"), "error");
        });
    }
    const [_, refresh] = useState(null);

    useEffect(() => {
        Config.all().then((c) => {
            delete c.constant; // The constant key contains read only global variable that are
                               // application wide truth => not editable from the admin area
            setForm(c)
        });
    }, []);

    return (
        <form className="sticky">
            <FormBuilder
                form={form}
                onChange={onChange}
                autoComplete="new-password"
                render={ ($input, props, struct, onChange) => (
                    <label className={"no-select input_type_" + props.params["type"]}>
                        <div>
                            <span>
                                { format(struct.label) }:
                            </span>
                            <div style={{width: "100%"}}>
                                { $input }
                            </div>
                        </div>
                        <div>
                            <span className="nothing"></span>
                            <div style={{width: "100%"}}>
                                { struct.description ? (<div className="description">{struct.description}</div>) : null }
                            </div>
                        </div>
                    </label>
                )} />
            </form>
    );
}
