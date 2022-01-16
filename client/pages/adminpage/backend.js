/* eslint-disable max-len */
import React, { useState, useEffect } from "react";
import { FormBuilder, Icon, Input, Alert, Textarea, Select, Loader } from "../../components/";
import { Backend, Config, Middleware } from "../../model/";
import { FormObjToJSON, notify, format, createFormBackend, objectGet } from "../../helpers/";
import { t } from "../../locales/";

import "./backend.scss";

export class BackendPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            backend_enabled: [],
            backend_available: {},
            auth_enabled: null,
            auth_available: {},
            config: null,
            isLoading: true,
        };
    }

    componentDidMount() {
        Promise.all([
            Backend.all(),
            Config.all(),
            Middleware.getAllAuthentication()
        ]).then((data) => {
            const [backend, config, middleware_auth] = data;
            delete config["constants"];
            this.setState({
                isLoading: false,
                backend_available: backend,
                backend_enabled: window.CONFIG["connections"].filter((b) => b).map((conn) => {
                    const f = createFormBackend(backend, conn);
                    if (Object.keys(f).length === 0) {
                        return null
                    }
                    return f;
                }).filter((a) => a !== null),
                config: config,
                auth_available: middleware_auth,
                auth_enabled: {
                    // We are storing the config in a fixed schema as we had issues with handling
                    // different schema for each authentication middleware.
                    "identity_provider": (function() {
                        let { type, params } = objectGet(config, ["middleware", "identity_provider"]) || {};
                        type = objectGet(type, ["value"]);
                        params = objectGet(params, ["value"]);
                        if(!type) return {};
                        const idpParams = JSON.parse(params);
                        const idpForm = middleware_auth[type] || {};
                        for(let key in idpParams) {
                            if (!idpForm[key]) continue;
                            idpForm[key]["value"] = idpParams[key]
                        }
                        return idpForm;
                    }()),
                    "attribute_mapping": (function(state) {
                        let { related_backend, params = {} } = objectGet(config, ["middleware", "attribute_mapping"]) || {};
                        related_backend = objectGet(related_backend, ["value"]);
                        params = JSON.parse(objectGet(params, ["value"]) || "{}");
                        const backendsForm = Object.keys(params).reduce((acc, key) => {
                            const t = createFormBackend(
                                backend,
                                params[key],
                            )
                            acc[key] = t[params[key]["type"]];
                            return acc;
                        }, {})
                        let json = {
                            "related_backend": {
                                "label": "Related Backend",
                                "type": "text",
                                "description": "List of backends to have behind the authentication process. Can be either a backend type of the actual label",
                                "placeholder": "eg: ftp,sftp,webdav",
                                "readonly": false,
                                "default": null,
                                "value": related_backend,
                                "multi": true,
                                "datalist": window.CONFIG["connections"].map((r) => r.label),
                                "required": true
                            },
                            ...backendsForm,
                        }
                        return json;
                    })(),
                }
            });
        });
    }

    componentWillUnmount() {
        this.props.isSaving(false);
        Config.clear();
    }

    refresh() {
        // refresh the screen to refresh the mutation
        // that have happenned down the stack which react couldn't detect directly
        this.setState({ refresh: Math.random() });
    }

    _buildConfig() {
        const json = FormObjToJSON(this.state.config);
        json.connections = this.state.backend_enabled.map((backend) => {
            const data = FormObjToJSON(backend, (obj, key) => {
                if (obj[key].enabled === true) {
                    obj[key] = obj[key].value || obj[key].default;
                } else {
                    delete obj[key];
                }
            });
            const key = Object.keys(data)[0];
            return data[key];
        });
        return json;
    }

    onUpdateStorageBackend(e) {
        this.refresh()
        const json = this._buildConfig();
        this.props.isSaving(true);
        return Config.save(json, true, () => {
            this.props.isSaving(false);
        }, (err) => {
            notify.send(err && err.message || t("Oops"), "error");
            this.props.isSaving(false);
        });
    }

    onUpdateAuthenticationMiddleware(middlewareData = null) {
        this.refresh();
        const json = this._buildConfig();
        json["middleware"] = {
            "identity_provider": (function() {
                const { type, ...other } = objectGet(middlewareData, ["identity_provider"]) || {};
                return {
                    "type": type || null,
                    "params": JSON.stringify(other),
                }
            })(),
            "attribute_mapping": (function() {
                let { related_backend = null, ...params } = objectGet(middlewareData, ["attribute_mapping"]) || {};
                if (related_backend !== null) {
                    return {
                        "related_backend": related_backend || "N/A",
                        "params": JSON.stringify(params),
                    }
                }
                ({ related_backend, ...params } = objectGet(json, ["middleware", "attribute_mapping"]) || {});
                return {
                    "related_backend": related_backend || "N/A",
                    "params": JSON.stringify(params),
                }
            })(),
        };

        this.props.isSaving(true);
        return Config.save(json, true, () => {
            this.props.isSaving(false);
        }, (err) => {
            notify.send(err && err.message || t("Oops"), "error");
            this.props.isSaving(false);
        });
    }

    addBackend(backend_id) {
        this.setState({
            backend_enabled: this.state.backend_enabled.concat(
                createFormBackend(this.state.backend_available, {
                    type: backend_id,
                    label: backend_id.toUpperCase(),
                }),
            ),
        }, this.onUpdateStorageBackend.bind(this));
    }

    removeBackend(n) {
        this.setState({
            backend_enabled: this.state.backend_enabled.filter((_, i) => i !== n),
        }, this.onUpdateStorageBackend.bind(this));
    }

    changeAuthentication(auth) {
        this.setState({
            auth_enabled: {
                "identity_provider": auth === null ? {} : this.state.auth_available[auth],
                "attribute_mapping": objectGet(this.state.auth_enabled, ["attribute_mapping"]) || {},
            }
        }, () => {
            this.onUpdateAuthenticationMiddleware(FormObjToJSON(this.state.auth_enabled))
        });
    }

    render() {
        const formRender = ($input, props, struct, onChange) => {
            const enable = (struct) => {
                if (typeof struct.value === "string") {
                    struct.enabled = true;
                    return true;
                }
                return !!struct.enabled;
            };
            const update = (value, struct) => {
                struct.enabled = value;
                this.refresh();
                if (value === false) {
                    struct.value = null;
                }
                return;
            };

            let $checkbox = (
                <Input type="checkbox" checked={enable(struct)}
                       style={{ width: "inherit", marginRight: "6px", top: "6px" }}
                       onChange={(e) => onChange(update.bind(this, e.target.checked))} />
            );
            if (struct.label === "label") {
                $checkbox = null;
            } else if (struct.readonly === true) {
                $checkbox = null;
            }
            return (
                <label className={"no-select input_type_" + props.params["type"]}>
                    <div>
                        <span>
                            { $checkbox }
                            { format(struct.label) }:
                        </span>
                        <div style={{ width: "100%" }}>
                            { $input }
                        </div>
                    </div>
                    <div>
                        <span className="nothing"></span>
                        <div style={{ width: "100%" }}>
                            {
                                struct.description ? (<div className="description">{struct.description}</div>) : null
                            }
                        </div>
                    </div>
                </label>
            );
        };

        return (
            <div className="component_dashboard">
                {
                    this.state.isLoading ? (
                        <Loader />
                    ) : (
                        <React.Fragment>
                            <StorageBackend
                                backend_available={this.state.backend_available}
                                backend_enabled={this.state.backend_enabled}
                                backend_add={this.addBackend.bind(this)}
                                backend_remove={this.removeBackend.bind(this)}
                                formChange={this.onUpdateStorageBackend.bind(this)}
                                formRender={formRender}
                            />
                            <AuthenticationMiddleware
                                authentication_available={this.state.auth_available}
                                authentication_enabled={this.state.auth_enabled}
                                authentication_update={this.changeAuthentication.bind(this)}
                                backend_available={this.state.backend_available}
                                backend_enabled={this.state.backend_enabled}
                                formChange={this.onUpdateAuthenticationMiddleware.bind(this)}
                                formRender={formRender}
                            />
                        </React.Fragment>
                    )
                }
            </div>
        );
    }
}

function StorageBackend({ backend_available, backend_enabled, backend_add, backend_remove, formChange, formRender }) {
    const isActiveBackend = (backend_key) => {
        return backend_enabled
            .map((b) => Object.keys(b)[0])
            .indexOf(backend_key) !== -1;
    };

    return (
        <div className="component_storagebackend">
            <h2>Storage Backend</h2>
            <div className="box-container">
                {
                    Object.keys(backend_available)
                        .sort((a, b) => a > b)
                        .map((backend_available_current, index) => (
                            <div key={index}
                                 onClick={() => backend_add(backend_available_current)}
                                 className={"box-item pointer no-select" + (isActiveBackend(backend_available_current) ? " active": "")}>
                                <div>
                                    { backend_available_current }
                                    <span className="no-select">
                                        <span className="icon">+</span>
                                    </span>
                                </div>
                            </div>
                        ))
                }
            </div>
            {
                backend_enabled.length !== 0 ? (
                    <div>
                        <form>
                            {
                                backend_enabled.map((backend_enabled_current, index) => {
                                    return (
                                        <div key={index}>
                                            <div className="icons no-select"
                                                 onClick={() => backend_remove(index)}>
                                                <Icon name="close" />
                                            </div>
                                            <FormBuilder onChange={formChange}
                                                         idx={index}
                                                         key={index}
                                                         form={{ "": backend_enabled_current }}
                                                         render={formRender} />
                                        </div>
                                    );
                                })
                            }
                        </form>
                    </div>
                ) : <Alert className="error">There is no storage selected. Where do you want to connect to?</Alert>
            }
        </div>
    )
}


function AuthenticationMiddleware({ authentication_available, authentication_enabled, backend_available, backend_enabled, authentication_update, formChange, formRender }) {
    const [formSpec, setFormSpec] = useState(authentication_enabled);
    const formChangeHandler = (e) => {
        formChange(e[""]);
    };

    useEffect(() => {
        setFormSpec(authentication_enabled);
    }, [ authentication_enabled ]);

    // we want to update the form in a few scenarios:
    // 1. user remove a storage backend
    // 2. user add a storage backend
    // 3. add a related backend in attribute mapping
    // 4. remove a related backend in attribute mapping

    // we want to update the form whenever a user change the related_backend input.
    // The change could be to either:
    // 1. add something to the list => create a new form in the attribute_mapping section
    // 2. remove something from the list => remove something in the attribute_mapping section
    useEffect(() => {
        if(!formSpec["identity_provider"]) return;

        const existingValues = (formSpec["attribute_mapping"]["related_backend"]["value"] || "")
              .split(/, ?/)
              .map((a) => a.trim());
        const { identity_provider, attribute_mapping } = formSpec;
        const selected = backend_enabled.map((b) => {
            const type = Object.keys(b)[0]
            return {
                label: b[type].label.value,
                type: type,
            }
        })
        let needToSave = false

        // detect missing form from the existing attribute_mapping
        // this happen whenever a user added something in the related_backend input
        for(let i=0; i<selected.length; i++) {
            if(attribute_mapping[selected[i].label]) continue;
            for(let j=0; j<existingValues.length; j++) {
                if(selected[i].label === existingValues[j]) {
                    attribute_mapping[selected[i].label] = backend_available[selected[i].type]
                    needToSave = true;
                }
            }
        }
        // detect out of date attribute_mapping that are still showing but shouldn't
        Object.keys(formSpec["attribute_mapping"]).map((key) => {
            if(key === "related_backend") return;
            if(existingValues.indexOf(key) !== -1) return;
            needToSave = true;
            delete attribute_mapping[key];
        })
        if (needToSave === false) return;
        const d = {
            identity_provider,
            attribute_mapping: attribute_mapping,
        };
        formChange(FormObjToJSON(d))
        setFormSpec(d)
    }, [ formSpec["attribute_mapping"]["related_backend"]["value"], !formSpec["identity_provider"] ])

    useEffect(() => { // autocompletion of the related_backend field
        const f = { ...formSpec }
        f.attribute_mapping.related_backend.datalist = backend_enabled
            .map((r) => r[Object.keys(r)[0]].label.value);

        const enabledBackendLabel = backend_enabled.map((b) => b[Object.keys(b)[0]].label.value)
        f.attribute_mapping.related_backend.value = (f.attribute_mapping.related_backend.value || "")
            .split(/, ?/)
            .filter((value) => enabledBackendLabel.indexOf(value) !== -1)
            .join(", ")

        setFormSpec(f);
    }, [ backend_enabled ])

    const isActiveAuth = (auth_key) => {
        return auth_key === objectGet(authentication_enabled, ["identity_provider", "type", "value"]);
    };

    if (Object.keys(authentication_available).length === 0) return null;
    return (
        <div className="component_authenticationmiddleware" style={{minHeight: "400px"}}>
            <h2>Authentication Middleware</h2>

            <div className="box-container">
                {
                    Object.keys(authentication_available)
                        .map((auth_current) => (
                            <div key={auth_current}
                                 onClick={() => authentication_update(isActiveAuth(auth_current) ? null : auth_current)}
                                 className={"box-item pointer no-select" + (isActiveAuth(auth_current) ? " active": "")}>
                                <div>
                                    { auth_current }
                                    <span className="no-select">
                                        <span className="icon">
                                            { isActiveAuth(auth_current) === false ? "+" :
                                              <Icon name="delete" /> }
                                        </span>
                                    </span>
                                </div>
                            </div>
                        ))
                }
            </div>
            {
                objectGet(authentication_enabled, ["identity_provider", "type"]) && (
                    <div className="authentication-middleware">
                        <FormBuilder
                            onChange={formChangeHandler}
                            form={{ "": formSpec }}
                            render={formRender}
                        />
                    </div>
                )
            }
        </div>
    )
}
