/* eslint-disable max-len */
import React from "react";
import { FormBuilder, Icon, Input, Alert } from "../../components/";
import { Backend, Config } from "../../model/";
import { FormObjToJSON, notify, format, createFormBackend } from "../../helpers/";
import { t } from "../../locales/";

import "./backend.scss";

export class BackendPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            backend_enabled: [],
            backend_available: [],
            auth_available: ["LDAP", "SAML", "OpenID", "External"],
            auth_enabled: null,
            config: null,
        };
    }

    componentDidMount() {
        Promise.all([
            Backend.all(),
            Config.all(),
        ]).then((data) => {
            const [backend, config] = data;
            this.setState({
                backend_available: backend,
                backend_enabled: window.CONFIG["connections"].filter((b) => b).map((conn) => {
                    const f = createFormBackend(backend, conn);
                    if (Object.keys(f).length === 0) {
                        return null
                    }
                    return f;
                }).filter((a) => a !== null),
                config: config,
            });
        });
    }

    onChange(e) {
        // refresh the screen to refresh the mutation
        // that have happenned down the stack
        this.setState({ refresh: Math.random() });

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

        // persist config object in the backend
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
        }, this.onChange.bind(this));
    }

    removeBackend(n) {
        this.setState({
            backend_enabled: this.state.backend_enabled.filter((_, i) => i !== n),
        }, this.onChange.bind(this));
    }

    onClickAuthAvailable(auth) {
        this.setState({
            auth_enabled: this.state.auth_enabled === auth ? null : auth,
        });
    }

    render() {
        const update = (value, struct) => {
            struct.enabled = value;
            this.setState({ refresh: Math.random() });
            if (value === false) {
                struct.value = null;
            }
            return;
        };

        const enable = (struct) => {
            if (typeof struct.value === "string") {
                struct.enabled = true;
                return true;
            }
            return !!struct.enabled;
        };

        const isActiveBackend = (backend_key) => {
            return this.state.backend_enabled
                .map((b) => Object.keys(b)[0])
                .indexOf(backend_key) !== -1;
        };

        const isActiveAuth = (auth_key) => {
            return auth_key === this.state.auth_enabled;
        };

        const renderForm = ($input, props, struct, onChange) => {
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
                <h2>Enabled Backends</h2>
                <div className="box-container">
                    {
                        Object.keys(this.state.backend_available)
                            .sort((a, b) => a > b)
                            .map((backend_available, index) => (
                                <div key={index}
                                    onClick={this.addBackend.bind(this, backend_available)}
                                    className={"box-item pointer no-select" + (isActiveBackend(backend_available) ? " active": "")}>
                                    <div>
                                        { backend_available }
                                        <span className="no-select">
                                            <span className="icon">+</span>
                                        </span>
                                    </div>
                                </div>
                            ))
                    }
                </div>

                <h2>Authentication Middleware</h2>

                <Alert>
                    Integrate Filestash with your identity management system
                </Alert>

                <div className="box-container">
                    {
                        this.state.auth_available.map((auth) => (
                            <div onClick={this.onClickAuthAvailable.bind(this, auth)} key={auth}
                                className={"box-item pointer no-select" + (isActiveAuth(auth) ? " active": "")}>
                                <div>
                                    { auth }
                                    <span className="no-select">
                                        <span className="icon">
                                            { isActiveAuth(auth) === false ? "+" :
                                                <Icon name="delete" /> }
                                        </span>
                                    </span>
                                </div>
                            </div>
                        ))
                    }
                </div>

                {
                    this.state.auth_enabled !== null && (
                        <React.Fragment>
                            <Alert className="success">
                                <i>
                                    <strong>Register your interest:
                                        <a href={`mailto:mickael@kerjean.me?Subject=Filestash - Authentication Middleware - ${this.state.auth_enabled}`}>
                                            mickael@kerjean.me
                                        </a>
                                    </strong>
                                </i>
                            </Alert>
                        </React.Fragment>
                    )
                }

                <h2>Backend Configuration</h2>

                {
                    this.state.backend_enabled.length !== 0 ? (
                        <div>
                            <form>
                                {
                                    this.state.backend_enabled.map((backend_enable, index) => {
                                        return (
                                            <div key={index}>
                                                <div className="icons no-select"
                                                    onClick={this.removeBackend.bind(this, index)}>
                                                    <Icon name="delete" />
                                                </div>
                                                <FormBuilder onChange={this.onChange.bind(this)}
                                                    idx={index}
                                                    key={index}
                                                    form={{ "": backend_enable }}
                                                    autoComplete="new-password"
                                                    render={renderForm} />
                                            </div>
                                        );
                                    })
                                }
                            </form>
                        </div>
                    ) : <Alert>You need to enable a backend first.</Alert>
                }
            </div>
        );
    }
}
