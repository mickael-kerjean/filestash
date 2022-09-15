import React, { createRef } from "react";

import { NgIf, Icon } from "../../components/";
import { Share } from "../../model/";
import {
    randomString, notify, absoluteToRelative, copyToClipboard, filetype,
} from "../../helpers/";
import { t } from "../../locales/";
import "./share.scss";

export class ShareComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = this.resetState();
        this.state.existings = [];
        this.$input = createRef();
    }

    resetState() {
        return {
            role: null,
            path: null,
            id: randomString(7),
            url: null,
            users: null,
            password: null,
            expire: null,
            can_manage_own: null,
            can_share: null,
            can_read: null,
            can_write: null,
            can_upload: null,
            show_advanced: false,
        };
    }

    componentDidMount() {
        Share.all(this.props.path).then((existings) => {
            this.refreshModal();
            this.setState({
                existings: existings.sort((a, b) => {
                    return a.path.split("/").length > b.path.split("/").length;
                }),
                role: existings.length === 0 ? window.CONFIG["share_default_access"] : null,
            });
        });
    }

    updateState(key, value) {
        if (key === "role") {
            this.setState(this.resetState());
        }
        if (this.state[key] === value) {
            this.setState({ [key]: null });
        } else {
            this.setState({ [key]: value });
        }

        if ((key === "role" && value) || (key === "show_advanced")) {
            this.refreshModal();
        }
    }

    refreshModal() {
        window.dispatchEvent(new Event("resize"));
    }

    onLoad(link) {
        const st = Object.assign({}, link);
        st.show_advanced = false;
        st.link_id = st.id;
        st.role = (st.role || "").toLowerCase();
        this.setState(st);
    }

    onDeleteLink(link_id) {
        let removed = null;
        let i = 0;

        for (i=0; i < this.state.existings.length; i++) {
            if (this.state.existings[i].id === link_id) {
                removed = Object.assign({}, this.state.existings[i]);
                break;
            }
        }
        if (removed !== null) {
            this.state.existings.splice(i, 1);
            this.setState({ existings: this.state.existings });
        }

        return Share.remove(link_id).catch((err) => {
            this.setState({ existings: [removed].concat(this.state.existings) });
            notify.send(err, "error");
        });
    }

    copyLinkInClipboard(link) {
        copyToClipboard(link);
        notify.send(t("The link was copied in the clipboard"), "INFO");
    }

    onRegisterLink(e) {
        this.copyLinkInClipboard(this.$input.current.value);

        const link = {
            role: this.state.role,
            path: this.props.path,
            id: this.state.url || this.state.id,
            url: this.state.url,
            users: this.state.users || null,
            password: this.state.password || null,
            expire: function(e) {
                if (typeof e === "string") {
                    return new Date(e).getTime();
                }
                return null;
            }(this.state.expire),
            can_manage_own: this.state.can_manage_own,
            can_share: this.state.can_share,
            can_read: function(r) {
                if (r === "viewer") return true;
                else if (r === "editor") return true;
                return false;
            }(this.state.role),
            can_write: function(r) {
                if (r === "editor") return true;
                return false;
            }(this.state.role),
            can_upload: function(r) {
                if (r === "uploader") return true;
                else if (r === "editor") return true;
                return false;
            }(this.state.role),
        };

        const links = [link];
        for (let i=0; i<this.state.existings.length; i++) {
            let insert = true;
            for (let j=0; j<links.length; j++) {
                if (this.state.existings[i].id === links[j].id) {
                    insert = false;
                    break;
                }
            }
            if (insert === true) {
                links.push(this.state.existings[i]);
            }
        }
        this.setState({ existings: links });
        return Share.upsert(link)
            .then(() => {
                if (this.state.url !== null && this.state.url !== this.state.id) {
                    this.onDeleteLink(this.state.id);
                }
                return Promise.resolve();
            })
            .then(() => this.setState(this.resetState()))
            .catch((err) => {
                notify.send(err, "error");
                const validLinks = this.state.existings.slice(1, this.state.existings.length);
                this.setState({ existings: validLinks });
            });
    }


    render() {
        const beautifulPath = function(from, to) {
            to = from.replace(/\/$/, "") + to;
            if (filetype(from) === "directory") {
                from = from.split("/");
                from = from.slice(0, from.length - 1);
                from = from.join("/");
            }
            const p = absoluteToRelative(from, to);
            return p.length < to.length ? p : to;
        };
        const urlify = function(str) {
            if (typeof str !== "string") return "";

            str = str.replace(/\s+/g, "+");
            str = str.replace(/[^a-zA-Z0-9\+-_]/g, "_");
            str = str.replace(/_+/g, "_");
            return str;
        };
        const datify = function(str) {
            if (!str) return str;
            const d = new Date(str);

            // old browser not implementing input[type=date] elements
            // may return invalid date,
            if (isNaN(d.getDate())) return str;

            const pad2 = (a) => ("00"+a).slice(-2);
            const pad4 = (a) => ("0000"+a).slice(-4);
            return [pad4(d.getFullYear()), pad2(d.getMonth()+1), pad2(d.getDate())].join("-");
        };

        return (
            <div className="component_share">
                <h2>{ t("Create a New Link") }</h2>

                <div className="share--content link-type no-select">
                    { this.props.type === "file" ? null :
                        <div
                            onClick={this.updateState.bind(this, "role", "uploader")}
                            className={this.state.role === "uploader" ? "active" : ""}>
                            { t("Uploader") }
                        </div>
                    }
                    <div
                        onClick={this.updateState.bind(this, "role", "viewer")}
                        className={this.state.role === "viewer" ? "active" : ""}>
                        { t("Viewer") }
                    </div>
                    <div
                        onClick={this.updateState.bind(this, "role", "editor")}
                        className={this.state.role === "editor" ? "active" : ""}>
                        { t("Editor") }
                    </div>
                </div>

                <NgIf
                    cond={this.state.role === null && !!this.state.existings && this.state.existings.length > 0}>
                    <h2>{ t("Existing Links") }</h2>
                    <div
                        className="share--content existing-links"
                        style={{ "maxHeight": this.state.existings && this.state.existings.length > 5 ? "90px" : "inherit" }}>
                        {
                            this.state.existings && this.state.existings.map((link, i) => {
                                return (
                                    <div className="link-details" key={i}>
                                        <span
                                            onClick={this.copyLinkInClipboard.bind(this, window.location.origin + window.sub_folder + "/s/"+link.id)}
                                            className="copy role">
                                            { t(link.role) }
                                        </span>
                                        <span
                                            onClick={this.copyLinkInClipboard.bind(this, window.location.origin + window.sub_folder + "/s/"+link.id)}
                                            className="copy path">
                                            { beautifulPath(this.props.path, link.path) }
                                        </span>
                                        <Icon
                                            onClick={this.onDeleteLink.bind(this, link.id)}
                                            name="delete" />
                                        <Icon
                                            onClick={this.onLoad.bind(this, link)}
                                            name="edit" />
                                    </div>
                                );
                            })
                        }
                    </div>
                </NgIf>

                <NgIf cond={this.state.role !== null}>
                    <h2>{ t("Restrictions") }</h2>
                    <div className="share--content restrictions no-select">
                        <SuperCheckbox
                            value={this.state.users}
                            label={ t("Only for users") }
                            placeholder="name0@email.com,name1@email.com"
                            onChange={this.updateState.bind(this, "users")}
                            inputType="text"/>
                        <SuperCheckbox
                            value={this.state.password}
                            label={ t("Password") }
                            placeholder={ t("protect access with a password") }
                            onChange={this.updateState.bind(this, "password")}
                            inputType="password"/>
                    </div>

                    <h2
                        className="no-select pointer"
                        onClick={this.updateState.bind(this, "show_advanced", !this.state.show_advanced)}>
                        { t("Advanced") }
                        <NgIf
                            type="inline"
                            cond={!!this.state.show_advanced}><Icon name="arrow_top"/></NgIf>
                        <NgIf
                            type="inline"
                            cond={!this.state.show_advanced}><Icon name="arrow_bottom"/></NgIf>
                    </h2>
                    <div className="share--content advanced-settings no-select">
                        <NgIf cond={this.state.show_advanced === true}>
                            <SuperCheckbox
                                value={datify(this.state.expire)}
                                label={ t("Expiration") }
                                placeholder={ t("The link won't be valid after") }
                                onChange={this.updateState.bind(this, "expire")}
                                inputType="date" />
                            <NgIf cond={this.state.role === "editor" && this.props.type !== "file"}>
                                <SuperCheckbox
                                    value={this.state.can_share}
                                    label={ t("Can Reshare") }
                                    onChange={this.updateState.bind(this, "can_share")} />
                            </NgIf>
                            <SuperCheckbox
                                value={this.state.url}
                                label={ t("Custom Link url") }
                                placeholder={ t("beautiful_url") }
                                onChange={(val) => this.updateState("url", urlify(val))}
                                inputType="text" />
                        </NgIf>
                    </div>

                    <div className="shared-link" onClick={this.onRegisterLink.bind(this)}>
                        <input
                            ref={this.$input}
                            className="copy"
                            type="text"
                            value={window.location.origin + window.sub_folder +"/s/"+(this.state.url || this.state.id)}
                            readOnly />
                        <div>
                            <button title={t("Copy URL")}>
                                <Icon name="copy"/>
                            </button>
                        </div>
                    </div>
                </NgIf>
            </div>
        );
    }
}

const SuperCheckbox = (props) => {
    const onCheckboxTick = (e) => {
        if (props.inputType === undefined) {
            return props.onChange(e.target.checked ? true : false);
        }
        return props.onChange(e.target.checked ? "" : null);
    };
    const onValueChange = (e) => {
        props.onChange(e.target.value);
    };
    const _is_expended = function(val) {
        return val === null || val === undefined || val === false ? false : true;
    }(props.value);

    return (
        <div className="component_supercheckbox">
            <label>
                <input type="checkbox" checked={_is_expended} onChange={onCheckboxTick} />
                {props.label}
            </label>
            <NgIf cond={_is_expended && props.inputType !== undefined}>
                <input
                    type={props.inputType}
                    placeholder={props.placeholder}
                    value={props.value || ""}
                    onChange={onValueChange} />
            </NgIf>
        </div>
    );
};
