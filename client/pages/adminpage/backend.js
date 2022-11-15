import React, { useState, useEffect } from "react";
import { FormBuilder, Icon, Input, Alert, Loader } from "../../components/";
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
            Middleware.getAllAuthentication(),
        ]).then((data) => {
            const [backend, config, middleware_auth] = data;
            delete config["constants"];
            this.setState({
                isLoading: false,
                backend_available: backend,
                backend_enabled: window.CONFIG["connections"].filter((b) => b).map((conn) => {
                    const f = createFormBackend(backend, conn);
                    if (Object.keys(f).length === 0) {
                        return null;
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
                        if (!type) return {};
                        const idpParams = JSON.parse(params);
                        const idpForm = middleware_auth[type] || {};
                        let key = null;
                        for (key in idpParams) {
                            if (!idpForm[key]) continue;
                            idpForm[key]["value"] = idpParams[key];
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
                            );
                            acc[key] = t[params[key]["type"]];
                            return acc;
                        }, {});
                        return {
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
                                "required": true,
                            },
                            ...backendsForm,
                        };
                    })(),
                },
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
        this.refresh();
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
                };
            })(),
            "attribute_mapping": (function() {
                let { related_backend = null, ...params } = objectGet(middlewareData, ["attribute_mapping"]) || {};
                const obj = {
                    "related_backend": related_backend || "N/A"
                };
                if(Object.keys(params).length > 0) {
                    obj.params = JSON.stringify(params, (key, value) => {
                        if (value !== null) return value
                    });
                }
                return obj;
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
                    label: function() {
                        const existingLabels = this.state.backend_enabled
                              .filter((b) => !!b[backend_id])
                              .map((b) => b[backend_id]["label"]["value"]);

                        for (let i=1; i<=existingLabels.length; i++) {
                            const desiredLabel = backend_id.toUpperCase() + i;
                            if (existingLabels.indexOf(desiredLabel) === -1) {
                                return desiredLabel;
                            }
                        }
                        return backend_id.toUpperCase();
                    }.bind(this)(),
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
            },
        }, () => {
            this.onUpdateAuthenticationMiddleware(FormObjToJSON(this.state.auth_enabled));
        });
    }

    render() {
        const formRender = ($input, props, struct, onChange) => {
            if (struct.type === "enable") {
                // toggle buttons is to hide info from the login page
                // in this screen, we don't want users to have to click through too many things
                return null;
            }
            if (struct.type === "password" && CONFIG.is_debug_mode === true) {
                struct.type = "text";
            }
            return (
                <label className={"no-select input_type_" + props.params["type"]}>
                    <div>
                        <span>
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
                                struct.description ? (
                                    <div className="description" dangerouslySetInnerHTML={{
                                        __html: function() {
                                            const regLink = /\[([^\]]*)\]\(([^\)]+)\)/g;
                                            return struct.description
                                                .replace(regLink, "<a target=\"_blank\" href=\"$2\">$1</a>")
                                                .replaceAll("\n", "<br>");
                                        }()
                                    }}></div>
                                ) : null
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
                            <br/><Alert className="info">
                                Once you have selected one or more storage backend, you can add some middleware to:<br/>
                                &nbsp;&nbsp;1. link the storage to an identity provider using an authentication middleware plugin<br/>
                                &nbsp;&nbsp;2. change who can do what and where using an authorisation middleware plugin<br/>
                                <br/>
                                <img
                                    style={{display: "block", margin: "0 auto", border: "none"}}
                                    src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCEtLSBEbyBub3QgZWRpdCB0aGlzIGZpbGUgd2l0aCBlZGl0b3JzIG90aGVyIHRoYW4gZGlhZ3JhbXMubmV0IC0tPgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPgo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHZlcnNpb249IjEuMSIgd2lkdGg9IjM5M3B4IiBoZWlnaHQ9IjIyMnB4IiB2aWV3Qm94PSItMC41IC0wLjUgMzkzIDIyMiIgY29udGVudD0iJmx0O214ZmlsZSBob3N0PSZxdW90O2FwcC5kaWFncmFtcy5uZXQmcXVvdDsgbW9kaWZpZWQ9JnF1b3Q7MjAyMi0xMS0xNFQwODowMDo0NC41MTVaJnF1b3Q7IGFnZW50PSZxdW90OzUuMCAoWDExOyBMaW51eCB4ODZfNjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMDYuMC4wLjAgU2FmYXJpLzUzNy4zNiZxdW90OyBldGFnPSZxdW90O1JFSFdMUU5WazhqUmhUMU1laWlzJnF1b3Q7IHZlcnNpb249JnF1b3Q7MjAuNC4xJnF1b3Q7IHR5cGU9JnF1b3Q7ZGV2aWNlJnF1b3Q7Jmd0OyZsdDtkaWFncmFtIGlkPSZxdW90O2s1N0xTOEdacEVaNHhzVmxxcnR3JnF1b3Q7IG5hbWU9JnF1b3Q7UGFnZS0xJnF1b3Q7Jmd0OzdacGZjOW80RU1BL0RZOWhiTXZDOEFnSlNTOURwK25SbWJzK0dsdXgxUWlMRWFMQWZmcVRiUG12RExpSjNiZ1pKak1aYVNWTDF2NTJWOUxpQWJoZEh4Nll1d2svVXgrUmdXWDRod0c0RzFqV3hBVGl2eFFjRTRFRGpFUVFNT3duSWpNWExQRi9TQW5UYmp2c28yMnBJNmVVY0x3cEN6MGFSY2pqSlpuTEdOMlh1ejFUVXA1MTR3WklFeXc5bCtqU2Y3RFB3MFE2dHB4Yy9nbmhJRXhuTmtlVHBHWHRwcDNWU3JhaDY5TjlRUVRtQTNETEtPVkphWDI0UlVUcUx0Vkw4dHo5aWRic3hSaUtlSk1IOE5jRkNIKzhzRS9CNDlmSHg4VWp2NStITjJxVW55N1pxUVdybCtYSFZBUGl2VGV5S0daeUNVR0VCc3hkRDhCc2d4aGVJNDVZdGUwcGI1anRROHpSY3VONmNvUzlzQkFoQy9tYWlKb3Bpcy80Z0ZMb3N1NjcyeEQ1cXJMbGpMNmdXMG9vaTk4RVRHejVGejlHU0NxUGFJU3l6aWtpb2R5WnJwOTBzWWh4ZENpSWxMNGVFQld2elk2aWkyb0Z0bUozVEkxUzFmZTVLWXlVS0N4YXdWZ0pYV1Y5UVRaMERrZ1VGS05mNEdYMWk5Y2JFVDNUaU5jOTNBSTZlOVEzZEtBNXV0MmFURDB1MVRLVEs4WWlIQzNjRlNKUGRJczVwcEhvc3FLYzAzV2h3NVRnUURad1dtRkdkNXpnU0VCS0E2VFJDOSt5cW9DZ3FRRUNOWUJHWGZGeE5EN1RIUS9GQW9WMlk2VlhhWW1GOHJLcXkxcFYycXRScUt0WWVXSjB4R29ncnJIdnkybHEvWkhSWGVUSFVkS0lhOXhWTm5FenRwVlRwUzdxbkhHeXVKOWFqZEZHc0RRclFCMm9BVFd0R3FLZ0s2SmpqZWlUMEJiMUtQbG9MTnNJbUtCditFejljSEwvMTJJK3NFWkVzbG94VVFwa2FmbnR5OS9UaC9uSmNPb2RSUUQwRVFPWE43aFZ3bU94eWdTdTl4TEVsTDRrY1RRMUQwVUYxbEE2RTF4UCtlSnZDcm9RVmlCYkl3M3lwRzVYTk95dUlQZnNSTk96RTZodDlPMFlZK3JuR0xsUFVvYTNIM0tiYkdObmRIb1hXdTNtWHVmdEdEbk9tSWlEaUYvMnAxenJabzJTaXhRbTU4K2gzVnpveHJCRVFzeW5rNmlOZjUyUkdHa2tQc2RXdlJmcjdLa3ZsV0xrNjQ2YjRzWEZERGdLdnNucnl0ME5hSWx2NVZLUmJXWVh3bVYzanFiZktqU29LUEtuTWxNbDZSQjN1OFhlS1pjeWF2UXRsTVdPLzZyR3VQSmRWb1lXVE90M2gyTHIzWEZ3NlFyNEM2NkgvRkw2VEFkVFVEeXNVWHdxWTRpSXdQQ3puSFNybzZGbWVLSll2TW5wdTBmMWxyaWxPK1loOVZReFNWWWRDRnJETVhSTTIwcitUNnJERHExaXMxV2VoYnNzUUZ5YkpiYWNUQ2R2U1A0WVhSdlRSN0lKRzhJS1BQTjFObUU3RndicUdudURKTzBWZStiQkU3dWRVR0NiRndicUdudURtOUVWZSs2a2xaMi9lbUpyakIxZUdLaHI3QTN5eEZmc3VaTzJoQjFNM2hsN2d4dlpGWHQrVEdzTCt5WDc2Um83N0JyN2lmdkJtY3NCeUc0T2hUeGFlMWVHUktObmRHTDJ5OWFnMmRJNUVvSjNQa2ZxcVliZkZtTFFBZlBNQ0VYNWU2R2NtNkNzU09VNFVOWHFEYkNSbVNWVS9pQXpBeTJGTlBqZUlhMUJ5dU1qNWhhaERZY1ZCeCtQaHpXWjNob2Jzb3d6OXZLMkQwYjBIMEdYbkRMNTFaTmx5QiszaE1kcmVLNXB4Z3UveWxRdkd6VnBSdE9wNGZ5S1BLT281dCtJSlQ2YWYyZ0g1djhEJmx0Oy9kaWFncmFtJmd0OyZsdDsvbXhmaWxlJmd0OyI+PGRlZnMvPjxnPjxwYXRoIGQ9Ik0gODEgMTgxIEwgMTAxIDEgTCAxNDEgMSBMIDEyMSAxODEgWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTQ5NDk0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLWRhc2hhcnJheT0iNiA2IiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PHBhdGggZD0iTSAyMDEgMTgxIEwgMjIxIDEgTCAyNjEgMSBMIDI0MSAxODEgWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTQ5NDk0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSIxNiIgY3k9IjU5LjUiIHJ4PSI3LjUiIHJ5PSI3LjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0OTQ5NCIgc3Ryb2tlLXdpZHRoPSIyIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PHBhdGggZD0iTSAxNiA2NyBMIDE2IDkyIE0gMTYgNzIgTCAxIDcyIE0gMTYgNzIgTCAzMSA3MiBNIDE2IDkyIEwgMSAxMTIgTSAxNiA5MiBMIDMxIDExMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTQ5NDk0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxyZWN0IHg9IjUxIiB5PSI3NiIgd2lkdGg9IjEyMCIgaGVpZ2h0PSIzMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJub25lIiB0cmFuc2Zvcm09InJvdGF0ZSgtODQsMTExLDkxKSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0wLjUgLTAuNSlyb3RhdGUoLTg0IDExMSA5MSkiPjxzd2l0Y2g+PGZvcmVpZ25PYmplY3QgcG9pbnRlci1ldmVudHM9Im5vbmUiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHJlcXVpcmVkRmVhdHVyZXM9Imh0dHA6Ly93d3cudzMub3JnL1RSL1NWRzExL2ZlYXR1cmUjRXh0ZW5zaWJpbGl0eSIgc3R5bGU9Im92ZXJmbG93OiB2aXNpYmxlOyB0ZXh0LWFsaWduOiBsZWZ0OyI+PGRpdiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCIgc3R5bGU9ImRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiB1bnNhZmUgY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IHVuc2FmZSBjZW50ZXI7IHdpZHRoOiAxMThweDsgaGVpZ2h0OiAxcHg7IHBhZGRpbmctdG9wOiA5MXB4OyBtYXJnaW4tbGVmdDogNTJweDsiPjxkaXYgZGF0YS1kcmF3aW8tY29sb3JzPSJjb2xvcjogIzk0OTQ5NDsgIiBzdHlsZT0iYm94LXNpemluZzogYm9yZGVyLWJveDsgZm9udC1zaXplOiAwcHg7IHRleHQtYWxpZ246IGNlbnRlcjsiPjxkaXYgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgZm9udC1zaXplOiAxN3B4OyBmb250LWZhbWlseTogSGVsdmV0aWNhOyBjb2xvcjogcmdiKDE0OCwgMTQ4LCAxNDgpOyBsaW5lLWhlaWdodDogMS4yOyBwb2ludGVyLWV2ZW50czogYWxsOyB3aGl0ZS1zcGFjZTogbm9ybWFsOyBvdmVyZmxvdy13cmFwOiBub3JtYWw7Ij5BdXRoZW50aWNhdGlvbjwvZGl2PjwvZGl2PjwvZGl2PjwvZm9yZWlnbk9iamVjdD48dGV4dCB4PSIxMTEiIHk9Ijk2IiBmaWxsPSIjOTQ5NDk0IiBmb250LWZhbWlseT0iSGVsdmV0aWNhIiBmb250LXNpemU9IjE3cHgiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkF1dGhlbnRpY2F0aW9uPC90ZXh0Pjwvc3dpdGNoPjwvZz48cmVjdCB4PSIxNzEiIHk9Ijc2IiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjMwIiBmaWxsPSJub25lIiBzdHJva2U9Im5vbmUiIHRyYW5zZm9ybT0icm90YXRlKC04NCwyMzEsOTEpIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTAuNSAtMC41KXJvdGF0ZSgtODQgMjMxIDkxKSI+PHN3aXRjaD48Zm9yZWlnbk9iamVjdCBwb2ludGVyLWV2ZW50cz0ibm9uZSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgcmVxdWlyZWRGZWF0dXJlcz0iaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHMTEvZmVhdHVyZSNFeHRlbnNpYmlsaXR5IiBzdHlsZT0ib3ZlcmZsb3c6IHZpc2libGU7IHRleHQtYWxpZ246IGxlZnQ7Ij48ZGl2IHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sIiBzdHlsZT0iZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IHVuc2FmZSBjZW50ZXI7IGp1c3RpZnktY29udGVudDogdW5zYWZlIGNlbnRlcjsgd2lkdGg6IDExOHB4OyBoZWlnaHQ6IDFweDsgcGFkZGluZy10b3A6IDkxcHg7IG1hcmdpbi1sZWZ0OiAxNzJweDsiPjxkaXYgZGF0YS1kcmF3aW8tY29sb3JzPSJjb2xvcjogIzk0OTQ5NDsgIiBzdHlsZT0iYm94LXNpemluZzogYm9yZGVyLWJveDsgZm9udC1zaXplOiAwcHg7IHRleHQtYWxpZ246IGNlbnRlcjsiPjxkaXYgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgZm9udC1zaXplOiAxN3B4OyBmb250LWZhbWlseTogSGVsdmV0aWNhOyBjb2xvcjogcmdiKDE0OCwgMTQ4LCAxNDgpOyBsaW5lLWhlaWdodDogMS4yOyBwb2ludGVyLWV2ZW50czogYWxsOyB3aGl0ZS1zcGFjZTogbm9ybWFsOyBvdmVyZmxvdy13cmFwOiBub3JtYWw7Ij5Qcm90b2NvbDwvZGl2PjwvZGl2PjwvZGl2PjwvZm9yZWlnbk9iamVjdD48dGV4dCB4PSIyMzEiIHk9Ijk2IiBmaWxsPSIjOTQ5NDk0IiBmb250LWZhbWlseT0iSGVsdmV0aWNhIiBmb250LXNpemU9IjE3cHgiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlByb3RvY29sPC90ZXh0Pjwvc3dpdGNoPjwvZz48cGF0aCBkPSJNIDI5MSA0MiBDIDI5MSAzMy43MiAzMTEuMTUgMjcgMzM2IDI3IEMgMzQ3LjkzIDI3IDM1OS4zOCAyOC41OCAzNjcuODIgMzEuMzkgQyAzNzYuMjYgMzQuMjEgMzgxIDM4LjAyIDM4MSA0MiBMIDM4MSAxMTYgQyAzODEgMTI0LjI4IDM2MC44NSAxMzEgMzM2IDEzMSBDIDMxMS4xNSAxMzEgMjkxIDEyNC4yOCAyOTEgMTE2IFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0OTQ5NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48cGF0aCBkPSJNIDM4MSA0MiBDIDM4MSA1MC4yOCAzNjAuODUgNTcgMzM2IDU3IEMgMzExLjE1IDU3IDI5MSA1MC4yOCAyOTEgNDIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0OTQ5NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMC41IC0wLjUpIj48c3dpdGNoPjxmb3JlaWduT2JqZWN0IHBvaW50ZXItZXZlbnRzPSJub25lIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiByZXF1aXJlZEZlYXR1cmVzPSJodHRwOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9mZWF0dXJlI0V4dGVuc2liaWxpdHkiIHN0eWxlPSJvdmVyZmxvdzogdmlzaWJsZTsgdGV4dC1hbGlnbjogbGVmdDsiPjxkaXYgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiIHN0eWxlPSJkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogdW5zYWZlIGNlbnRlcjsganVzdGlmeS1jb250ZW50OiB1bnNhZmUgY2VudGVyOyB3aWR0aDogODhweDsgaGVpZ2h0OiAxcHg7IHBhZGRpbmctdG9wOiA5MnB4OyBtYXJnaW4tbGVmdDogMjkycHg7Ij48ZGl2IGRhdGEtZHJhd2lvLWNvbG9ycz0iY29sb3I6ICM5NDk0OTQ7ICIgc3R5bGU9ImJveC1zaXppbmc6IGJvcmRlci1ib3g7IGZvbnQtc2l6ZTogMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7Ij48ZGl2IHN0eWxlPSJkaXNwbGF5OiBpbmxpbmUtYmxvY2s7IGZvbnQtc2l6ZTogMTdweDsgZm9udC1mYW1pbHk6IEhlbHZldGljYTsgY29sb3I6IHJnYigxNDgsIDE0OCwgMTQ4KTsgbGluZS1oZWlnaHQ6IDEuMjsgcG9pbnRlci1ldmVudHM6IGFsbDsgd2hpdGUtc3BhY2U6IG5vcm1hbDsgb3ZlcmZsb3ctd3JhcDogbm9ybWFsOyI+RklMRTxiciAvPlNUT1JBR0U8L2Rpdj48L2Rpdj48L2Rpdj48L2ZvcmVpZ25PYmplY3Q+PHRleHQgeD0iMzM2IiB5PSI5NyIgZmlsbD0iIzk0OTQ5NCIgZm9udC1mYW1pbHk9IkhlbHZldGljYSIgZm9udC1zaXplPSIxN3B4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5GSUxFLi4uPC90ZXh0Pjwvc3dpdGNoPjwvZz48cGF0aCBkPSJNIDE0MSAxODEgTCAxNjEgMSBMIDIwMSAxIEwgMTgxIDE4MSBaIiBmaWxsPSJub25lIiBzdHJva2U9IiM5NDk0OTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBzdHJva2UtZGFzaGFycmF5PSI2IDYiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48cmVjdCB4PSIxMTEiIHk9Ijc2IiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjMwIiBmaWxsPSJub25lIiBzdHJva2U9Im5vbmUiIHRyYW5zZm9ybT0icm90YXRlKC04NCwxNzEsOTEpIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTAuNSAtMC41KXJvdGF0ZSgtODQgMTcxIDkxKSI+PHN3aXRjaD48Zm9yZWlnbk9iamVjdCBwb2ludGVyLWV2ZW50cz0ibm9uZSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgcmVxdWlyZWRGZWF0dXJlcz0iaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHMTEvZmVhdHVyZSNFeHRlbnNpYmlsaXR5IiBzdHlsZT0ib3ZlcmZsb3c6IHZpc2libGU7IHRleHQtYWxpZ246IGxlZnQ7Ij48ZGl2IHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sIiBzdHlsZT0iZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IHVuc2FmZSBjZW50ZXI7IGp1c3RpZnktY29udGVudDogdW5zYWZlIGNlbnRlcjsgd2lkdGg6IDExOHB4OyBoZWlnaHQ6IDFweDsgcGFkZGluZy10b3A6IDkxcHg7IG1hcmdpbi1sZWZ0OiAxMTJweDsiPjxkaXYgZGF0YS1kcmF3aW8tY29sb3JzPSJjb2xvcjogIzk0OTQ5NDsgIiBzdHlsZT0iYm94LXNpemluZzogYm9yZGVyLWJveDsgZm9udC1zaXplOiAwcHg7IHRleHQtYWxpZ246IGNlbnRlcjsiPjxkaXYgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgZm9udC1zaXplOiAxN3B4OyBmb250LWZhbWlseTogSGVsdmV0aWNhOyBjb2xvcjogcmdiKDE0OCwgMTQ4LCAxNDgpOyBsaW5lLWhlaWdodDogMS4yOyBwb2ludGVyLWV2ZW50czogYWxsOyB3aGl0ZS1zcGFjZTogbm9ybWFsOyBvdmVyZmxvdy13cmFwOiBub3JtYWw7Ij5BdXRob3Jpc2F0aW9uPC9kaXY+PC9kaXY+PC9kaXY+PC9mb3JlaWduT2JqZWN0Pjx0ZXh0IHg9IjE3MSIgeT0iOTYiIGZpbGw9IiM5NDk0OTQiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EiIGZvbnQtc2l6ZT0iMTdweCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QXV0aG9yaXNhdGlvbjwvdGV4dD48L3N3aXRjaD48L2c+PHBhdGggZD0iTSAxMzYgMTQwIEwgMTMzLjUgMTQwIFEgMTMxIDE0MCAxMzEgMTUwIEwgMTMxIDE4MCBRIDEzMSAxOTAgMTI4LjUgMTkwIEwgMTI3LjI1IDE5MCBRIDEyNiAxOTAgMTI4LjUgMTkwIEwgMTI5Ljc1IDE5MCBRIDEzMSAxOTAgMTMxIDIwMCBMIDEzMSAyMzAgUSAxMzEgMjQwIDEzMy41IDI0MCBMIDEzNiAyNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0OTQ5NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHRyYW5zZm9ybT0icm90YXRlKC05MCwxMzEsMTkwKSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxyZWN0IHg9IjEwMSIgeT0iMTkxIiB3aWR0aD0iNjAiIGhlaWdodD0iMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0wLjUgLTAuNSkiPjxzd2l0Y2g+PGZvcmVpZ25PYmplY3QgcG9pbnRlci1ldmVudHM9Im5vbmUiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHJlcXVpcmVkRmVhdHVyZXM9Imh0dHA6Ly93d3cudzMub3JnL1RSL1NWRzExL2ZlYXR1cmUjRXh0ZW5zaWJpbGl0eSIgc3R5bGU9Im92ZXJmbG93OiB2aXNpYmxlOyB0ZXh0LWFsaWduOiBsZWZ0OyI+PGRpdiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCIgc3R5bGU9ImRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiB1bnNhZmUgY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IHVuc2FmZSBjZW50ZXI7IHdpZHRoOiA1OHB4OyBoZWlnaHQ6IDFweDsgcGFkZGluZy10b3A6IDIwNXB4OyBtYXJnaW4tbGVmdDogMTAycHg7Ij48ZGl2IGRhdGEtZHJhd2lvLWNvbG9ycz0iY29sb3I6ICM5NDk0OTQ7ICIgc3R5bGU9ImJveC1zaXppbmc6IGJvcmRlci1ib3g7IGZvbnQtc2l6ZTogMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7Ij48ZGl2IHN0eWxlPSJkaXNwbGF5OiBpbmxpbmUtYmxvY2s7IGZvbnQtc2l6ZTogMTdweDsgZm9udC1mYW1pbHk6IEhlbHZldGljYTsgY29sb3I6IHJnYigxNDgsIDE0OCwgMTQ4KTsgbGluZS1oZWlnaHQ6IDEuMjsgcG9pbnRlci1ldmVudHM6IGFsbDsgd2hpdGUtc3BhY2U6IG5vcm1hbDsgb3ZlcmZsb3ctd3JhcDogbm9ybWFsOyI+TWlkZGxld2FyZTwvZGl2PjwvZGl2PjwvZGl2PjwvZm9yZWlnbk9iamVjdD48dGV4dCB4PSIxMzEiIHk9IjIxMCIgZmlsbD0iIzk0OTQ5NCIgZm9udC1mYW1pbHk9IkhlbHZldGljYSIgZm9udC1zaXplPSIxN3B4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NaWRkbGV3Li4uPC90ZXh0Pjwvc3dpdGNoPjwvZz48cGF0aCBkPSJNIDUxIDYxIEwgODUuNjIgNjEuMjMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0OTQ5NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJzdHJva2UiLz48cGF0aCBkPSJNIDkxLjYyIDYxLjI3IEwgODMuNTkgNjUuMjIgTCA4NS42MiA2MS4yMyBMIDgzLjY1IDU3LjIyIFoiIGZpbGw9IiM5NDk0OTQiIHN0cm9rZT0iIzk0OTQ5NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48cGF0aCBkPSJNIDE5NiA2MiBMIDIwNy43NiA2MiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTQ5NDk0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9InN0cm9rZSIvPjxwYXRoIGQ9Ik0gMjEzLjc2IDYyIEwgMjA1Ljc2IDY2IEwgMjA3Ljc2IDYyIEwgMjA1Ljc2IDU4IFoiIGZpbGw9IiM5NDk0OTQiIHN0cm9rZT0iIzk0OTQ5NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48cGF0aCBkPSJNIDEzNSA2MSBMIDE0Ni43NiA2MSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTQ5NDk0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9InN0cm9rZSIvPjxwYXRoIGQ9Ik0gMTUyLjc2IDYxIEwgMTQ0Ljc2IDY1IEwgMTQ2Ljc2IDYxIEwgMTQ0Ljc2IDU3IFoiIGZpbGw9IiM5NDk0OTQiIHN0cm9rZT0iIzk0OTQ5NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48cGF0aCBkPSJNIDIxMSAxMDEgTCAxOTkuMjQgMTAxIiBmaWxsPSJub25lIiBzdHJva2U9IiM5NDk0OTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBwb2ludGVyLWV2ZW50cz0ic3Ryb2tlIi8+PHBhdGggZD0iTSAxOTMuMjQgMTAxIEwgMjAxLjI0IDk3IEwgMTk5LjI0IDEwMSBMIDIwMS4yNCAxMDUgWiIgZmlsbD0iIzk0OTQ5NCIgc3Ryb2tlPSIjOTQ5NDk0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxwYXRoIGQ9Ik0gMTUxIDEwMSBMIDEzOS4yNCAxMDEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0OTQ5NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJzdHJva2UiLz48cGF0aCBkPSJNIDEzMy4yNCAxMDEgTCAxNDEuMjQgOTcgTCAxMzkuMjQgMTAxIEwgMTQxLjI0IDEwNSBaIiBmaWxsPSIjOTQ5NDk0IiBzdHJva2U9IiM5NDk0OTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PHBhdGggZD0iTSA5MSAxMDEgTCA1OS4yNCAxMDEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0OTQ5NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJzdHJva2UiLz48cGF0aCBkPSJNIDUzLjI0IDEwMSBMIDYxLjI0IDk3IEwgNTkuMjQgMTAxIEwgNjEuMjQgMTA1IFoiIGZpbGw9IiM5NDk0OTQiIHN0cm9rZT0iIzk0OTQ5NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48cGF0aCBkPSJNIDI1NiA2MiBMIDI4Mi43NiA2MiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTQ5NDk0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9InN0cm9rZSIvPjxwYXRoIGQ9Ik0gMjg4Ljc2IDYyIEwgMjgwLjc2IDY2IEwgMjgyLjc2IDYyIEwgMjgwLjc2IDU4IFoiIGZpbGw9IiM5NDk0OTQiIHN0cm9rZT0iIzk0OTQ5NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48cGF0aCBkPSJNIDI5MSAxMDIgTCAyNTkuMjMgMTAxLjIxIiBmaWxsPSJub25lIiBzdHJva2U9IiM5NDk0OTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBwb2ludGVyLWV2ZW50cz0ic3Ryb2tlIi8+PHBhdGggZD0iTSAyNTMuMjQgMTAxLjA2IEwgMjYxLjMzIDk3LjI2IEwgMjU5LjIzIDEwMS4yMSBMIDI2MS4xMyAxMDUuMjUgWiIgZmlsbD0iIzk0OTQ5NCIgc3Ryb2tlPSIjOTQ5NDk0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxwYXRoIGQ9Ik0gMjk2LjUgODkuNSBMIDI5NCA4OS41IFEgMjkxLjUgODkuNSAyOTEuNSA5OS41IEwgMjkxLjUgMTgwIFEgMjkxLjUgMTkwIDI4OSAxOTAgTCAyODcuNzUgMTkwIFEgMjg2LjUgMTkwIDI4OSAxOTAgTCAyOTAuMjUgMTkwIFEgMjkxLjUgMTkwIDI5MS41IDIwMCBMIDI5MS41IDI4MC41IFEgMjkxLjUgMjkwLjUgMjk0IDI5MC41IEwgMjk2LjUgMjkwLjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0OTQ5NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHRyYW5zZm9ybT0icm90YXRlKC05MCwyOTEuNSwxOTApIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PHJlY3QgeD0iMjExIiB5PSIxOTEiIHdpZHRoPSIxNzAiIGhlaWdodD0iMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0wLjUgLTAuNSkiPjxzd2l0Y2g+PGZvcmVpZ25PYmplY3QgcG9pbnRlci1ldmVudHM9Im5vbmUiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHJlcXVpcmVkRmVhdHVyZXM9Imh0dHA6Ly93d3cudzMub3JnL1RSL1NWRzExL2ZlYXR1cmUjRXh0ZW5zaWJpbGl0eSIgc3R5bGU9Im92ZXJmbG93OiB2aXNpYmxlOyB0ZXh0LWFsaWduOiBsZWZ0OyI+PGRpdiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCIgc3R5bGU9ImRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiB1bnNhZmUgY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IHVuc2FmZSBjZW50ZXI7IHdpZHRoOiAxNjhweDsgaGVpZ2h0OiAxcHg7IHBhZGRpbmctdG9wOiAyMDVweDsgbWFyZ2luLWxlZnQ6IDIxMnB4OyI+PGRpdiBkYXRhLWRyYXdpby1jb2xvcnM9ImNvbG9yOiAjOTQ5NDk0OyAiIHN0eWxlPSJib3gtc2l6aW5nOiBib3JkZXItYm94OyBmb250LXNpemU6IDBweDsgdGV4dC1hbGlnbjogY2VudGVyOyI+PGRpdiBzdHlsZT0iZGlzcGxheTogaW5saW5lLWJsb2NrOyBmb250LXNpemU6IDE3cHg7IGZvbnQtZmFtaWx5OiBIZWx2ZXRpY2E7IGNvbG9yOiByZ2IoMTQ4LCAxNDgsIDE0OCk7IGxpbmUtaGVpZ2h0OiAxLjI7IHBvaW50ZXItZXZlbnRzOiBhbGw7IHdoaXRlLXNwYWNlOiBub3JtYWw7IG92ZXJmbG93LXdyYXA6IG5vcm1hbDsiPlN0b3JhZ2UgYmFja2VuZDwvZGl2PjwvZGl2PjwvZGl2PjwvZm9yZWlnbk9iamVjdD48dGV4dCB4PSIyOTYiIHk9IjIxMCIgZmlsbD0iIzk0OTQ5NCIgZm9udC1mYW1pbHk9IkhlbHZldGljYSIgZm9udC1zaXplPSIxN3B4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TdG9yYWdlIGJhY2tlbmQ8L3RleHQ+PC9zd2l0Y2g+PC9nPjwvZz48c3dpdGNoPjxnIHJlcXVpcmVkRmVhdHVyZXM9Imh0dHA6Ly93d3cudzMub3JnL1RSL1NWRzExL2ZlYXR1cmUjRXh0ZW5zaWJpbGl0eSIvPjxhIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsLTUpIiB4bGluazpocmVmPSJodHRwczovL3d3dy5kaWFncmFtcy5uZXQvZG9jL2ZhcS9zdmctZXhwb3J0LXRleHQtcHJvYmxlbXMiIHRhcmdldD0iX2JsYW5rIj48dGV4dCB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEwcHgiIHg9IjUwJSIgeT0iMTAwJSI+VGV4dCBpcyBub3QgU1ZHIC0gY2Fubm90IGRpc3BsYXk8L3RleHQ+PC9hPjwvc3dpdGNoPjwvc3ZnPgo="
                                />
                                ref: <a href="https://www.filestash.app/docs/plugin/">plugin documentation</a>
                            </Alert>
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
                            <div
                                key={index}
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
                                            <FormBuilder
                                                onChange={formChange}
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
    );
}


function AuthenticationMiddleware({ authentication_available, authentication_enabled, backend_available, backend_enabled, authentication_update, formChange, formRender }) {
    const [formSpec, setFormSpec] = useState(authentication_enabled);
    const formChangeHandler = (e) => {
        formChange(e[""]);
    };

    useEffect(() => {
        setFormSpec(authentication_enabled);
    }, [authentication_enabled]);

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
        if (!formSpec["identity_provider"]) return;

        const existingValues = (formSpec["attribute_mapping"]["related_backend"]["value"] || "")
            .split(/, ?/)
            .map((a) => a.trim());
        const { identity_provider, attribute_mapping } = formSpec;
        const selected = backend_enabled.map((b) => {
            const type = Object.keys(b)[0];
            return {
                label: b[type].label.value,
                type: Object.keys(b)[0],
            };
        });
        let needToSave = false;

        // detect missing form from the existing attribute_mapping
        // this happen whenever a user added something in the related_backend input
        for (let i=0; i<selected.length; i++) {
            if (attribute_mapping[selected[i].label]) continue;
            for (let j=0; j<existingValues.length; j++) {
                if (selected[i].label === existingValues[j]) {
                    attribute_mapping[selected[i].label] = JSON.parse(JSON.stringify(backend_available[selected[i].type]));
                    needToSave = true;
                }
            }
        }
        // detect out of date attribute_mapping that are still showing but shouldn't
        Object.keys(formSpec["attribute_mapping"]).map((key) => {
            if (key === "related_backend") return;
            if (existingValues.indexOf(key) !== -1) return;
            needToSave = true;
            delete attribute_mapping[key];
        });
        if (needToSave === false) return;
        const d = {
            identity_provider,
            attribute_mapping: attribute_mapping,
        };
        formChange(FormObjToJSON(d));
        setFormSpec(d);
    }, [
        formSpec["attribute_mapping"]["related_backend"]["value"],
        !formSpec["identity_provider"],
    ]);

    useEffect(() => { // autocompletion of the related_backend field
        const f = { ...formSpec };
        f.attribute_mapping.related_backend.datalist = backend_enabled
            .map((r) => r[Object.keys(r)[0]].label.value);

        const enabledBackendLabel = backend_enabled.map((b) => b[Object.keys(b)[0]].label.value);
        f.attribute_mapping.related_backend.value = (f.attribute_mapping.related_backend.value || "")
            .split(/, ?/)
            .filter((value) => enabledBackendLabel.indexOf(value) !== -1)
            .join(", ");

        setFormSpec(f);
    }, [backend_enabled]);

    const isActiveAuth = (auth_key) => {
        return auth_key === objectGet(authentication_enabled, ["identity_provider", "type", "value"]);
    };

    if (Object.keys(authentication_available).length === 0) return null;
    return (
        <div className="component_authenticationmiddleware" style={{ minHeight: "400px" }}>
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
                                            {
                                                isActiveAuth(auth_current) === false ?
                                                    "+" :
                                                    <Icon name="delete" />
                                            }
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
    );
}
