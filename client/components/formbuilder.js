import React from "react";
import PropTypes from "prop-types";

import { Input, Textarea, Select, Enabler } from "./";
import { FormObjToJSON, format, autocomplete, notify, gid } from "../helpers/";
import { t } from "../locales/";

import "./formbuilder.scss";

export class FormBuilder extends React.Component {
    constructor(props) {
        super(props);
    }

    section(struct, key, level = 0) {
        if (struct == null) struct = "";
        const isALeaf = function(struct) {
            if ("label" in struct && "type" in struct &&
               "value" in struct && "default" in struct) {
                return true;
            }
            return false;
        };

        if (Array.isArray(struct)) return null;
        else if (isALeaf(struct) === false) {
            const [normal, advanced] = function(s) {
                const _normal = [];
                const _advanced = [];
                for (const key in s) {
                    const tmp = { key: key, data: s[key] };
                    "id" in s[key] ? _advanced.push(tmp) : _normal.push(tmp);
                }
                return [_normal, _advanced];
            }(struct);
            if (level <= 1) {
                return (
                    <div className="formbuilder">
                        {
                            key ? <h2 className="no-select">{ format(key) }</h2> : ""
                        }
                        {
                            normal.map((s, index) => {
                                return (
                                    <div key={s.key+"-"+index}>
                                        { this.section(s.data, s.key, level + 1) }
                                    </div>
                                );
                            })
                        }
                        <div className="advanced_form">
                            {
                                advanced.map((s, index) => {
                                    return (
                                        <div key={s.key+"-"+index}>
                                            { this.section(s.data, s.key, level + 1) }
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                );
            }
            return (
                <div>
                    <fieldset>
                        <legend className="no-select">{ format(key) }</legend>
                        {
                            Object.keys(struct).map((key, index) => {
                                return (
                                    <div key={key+"-"+index}>
                                        { this.section(struct[key], key, level + 1) }
                                    </div>
                                );
                            })
                        }
                    </fieldset>
                </div>
            );
        }

        const id = {};
        let target = [];
        if (struct.id !== undefined) {
            id.id = this.props.idx === undefined ? struct.id : struct.id + "_" + this.props.idx;
        }
        if (struct.type === "enable") {
            target = struct.target.map((target) => {
                return this.props.idx === undefined ? target : target + "_" + this.props.idx;
            });
        }

        const onChange = function(e, fn) {
            struct.value = e;
            if (typeof fn === "function") {
                fn(struct);
            }
            this.props.onChange.call(
                this,
                FormObjToJSON(this.props.form),
            );
        };

        return (
            <FormElement render={this.props.render}
                onChange={onChange.bind(this)} {...id}
                params={struct} target={target} name={ format(struct.label) }
                autoComplete="new-password" />
        );
    }

    render() {
        return this.section(this.props.form || {});
    }
}


const FormElement = (props) => {
    const id = props.id !== undefined ? { id: props.id } : {};
    const struct = props.params;
    let $input = (
        <Input onChange={(e) => props.onChange(e.target.value)} {...id} name={struct.label}
            type="text" defaultValue={struct.value} placeholder={ t(struct.placeholder) } />
    );
    switch (props.params["type"]) {
    case "text": {
        const onTextChange = (value) => {
            if (value === "") {
                value = null;
            }
            props.onChange(value);
        };

        const list_id = struct.datalist ? gid("list_") : null;
        $input = (
            <Input list={list_id} onChange={(e) => onTextChange(e.target.value)} {...id}
                name={struct.label} type="text" value={struct.value || ""}
                placeholder={ t(struct.placeholder) } readOnly={struct.readonly}
                autoComplete="new-password" autoCorrect="off" autoCapitalize="off"
                spellCheck="false" />
        );
        if (list_id != null) {
            const filtered = function(multi, datalist, currentValue) {
                if (multi !== true || currentValue == null) return datalist;

                return autocomplete(
                    currentValue
                        .split(",")
                        .map((t) => t.trim())
                        .filter((t) => t),
                    datalist,
                );
            };
            $input = (
                <span>
                    { $input }
                    <datalist id={list_id}>
                        {
                            filtered(struct.multi, struct.datalist, struct.value).map((item, i) => {
                                return ( <option key={i} value={item} /> );
                            })
                        }
                    </datalist>
                </span>
            );
        }
        break;
    }
    case "number": {
        const onNumberChange = (value) => {
            value = value === "" ? null : parseInt(value);
            props.onChange(value);
        };
        $input = (
            <Input onChange={(e) => onNumberChange(e.target.value)} {...id} name={struct.label}
                type="number" value={struct.value === null ? "" : struct.value}
                placeholder={ t(struct.placeholder) } />
        );
        break;
    }
    case "password": {
        const onPasswordChange = (value) => {
            if (value === "") {
                value = null;
            }
            props.onChange(value);
        };
        $input = (
            <Input onChange={(e) => onPasswordChange(e.target.value)} {...id} name={struct.label}
                type="password" value={struct.value || ""} placeholder={ t(struct.placeholder) }
                autoComplete="new-password" autoCorrect="off" autoCapitalize="off"
                spellCheck="false"/>
        );
        break;
    }
    case "long_password": {
        const onLongPasswordChange = (value) => {
            if (value === "") {
                value = null;
            }
            props.onChange(value);
        };
        $input = (
            <Textarea {...id} disabledEnter={true} value={struct.value || ""}
                onChange={(e) => onLongPasswordChange(e.target.value)} type="text" rows="1"
                name={struct.label} placeholder={ t(struct.placeholder) }
                autoComplete="new-password" autoCorrect="off" autoCapitalize="off"
                spellCheck="false" />
        );
        break;
    }
    case "long_text":
        $input = (
            <Textarea {...id} disabledEnter={true} value={struct.value || ""}
                onChange={(e) => props.onChange(e.target.value)}
                type="text" rows="8" name={struct.label} placeholder={ t(struct.placeholder) }
                autoComplete="new-password" autoCorrect="off" autoCapitalize="off"
                spellCheck="false" />
        );
        break;
    case "bcrypt": {
        const onBcryptChange = (value) => {
            if (value === "") {
                return props.onChange(null);
            }
            return import(/* webpackChunkName: "bcrypt" */"../helpers/bcrypt")
                .catch((err) => notify.send(err && err.message, "error"))
                .then((bcrypt) => bcrypt.bcrypt_password(value))
                .then((hash) => props.onChange(hash));
        };
        $input = (
            <Input onChange={(e) => onBcryptChange(e.target.value)} {...id} name={struct.label}
                type="password" defaultValue={struct.value || ""}
                placeholder={ t(struct.placeholder) } />
        );
        break;
    }
    case "hidden":
        $input = (
            <Input name={struct.label} type="hidden" defaultValue={struct.value} />
        );
        break;
    case "boolean":
        $input = (
            <Input onChange={(e) => props.onChange(e.target.checked)} {...id} name={struct.label}
                type="checkbox" checked={struct.value === null ? !!struct.default : struct.value} />
        );
        break;
    case "select":
        $input = (
            <Select onChange={(e) => props.onChange(e.target.value)} {...id} name={struct.label}
                choices={struct.options} placeholder={ t(struct.placeholder) }
                value={struct.value === null ? struct.default : struct.value} />
        );
        break;
    case "enable":
        $input = (
            <Enabler onChange={(e) => props.onChange(e.target.checked)} {...id} name={struct.label}
                target={props.target}
                defaultValue={struct.value === null ? struct.default : struct.value} />
        );
        break;
    case "date":
        $input = (
            <Input onChange={(e) => props.onChange(e.target.value)} {...id} name={struct.label}
                type="date" defaultValue={struct.value || ""}
                placeholder={ t(struct.placeholder) } />
        );
        break;
    case "datetime":
        $input = (
            <Input onChange={(e) => props.onChange(e.target.value)} {...id} name={struct.label}
                type="datetime-local" defaultValue={struct.value || ""}
                placeholder={ t(struct.placeholder) } />
        );
        break;
    case "image":
        $input = ( <img {...id} src={struct.value} /> );
        break;
    case "file": {
        const getBase64 = function(file) {
            return new Promise((resolve, reject) => {
                const reader = new window.FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = (error) => reject(error);
            });
        };
        const onFileUpload = (e) => {
            if (e.target.files.length !== 1) return;
            if (e.target.files[0].size < 200000000) {
                getBase64(e.target.files[0]).then((a) => {
                    props.onChange(a);
                }).catch(() => {});
                return;
            }
            notify.send("File is too large", "WARNING");
        };
        $input = (
            <div className="fileupload-image">
                <input onChange={(e) => onFileUpload(e)} type="file" {...id} name={struct.label} />
                {
                    struct.value.substring(0, 10) === "data:image" ?
                        <img src={struct.value} /> : null
                }
                {
                    struct.value.substring(0, 20) === "data:application/pdf" ?
                        <object data={struct.value} type="application/pdf" /> : null
                }
            </div>
        );
        break;
    }
    case "oauth2":
        $input = null;
        break;
    }

    return props.render($input, props, struct, props.onChange.bind(null, null));
};

FormElement.propTypes = {
    render: PropTypes.func.isRequired,
};
