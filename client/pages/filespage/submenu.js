import React, { createRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";

import {
    NgIf, Icon, EventEmitter, Dropdown, DropdownButton, DropdownList,
    DropdownItem, Container, Loader,
} from "../../components/";
import { debounce, alert, confirm, prompt, notify } from "../../helpers/";
import { Files } from "../../model/";
import { ShareComponent } from "./share";
import { t } from "../../locales/";
import "./submenu.scss";
class SubmenuComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            search_input_visible: false,
            search_keyword: "",
        };
        this.$input = createRef();

        this.onSearchChange_Backpressure = debounce(this.onSearchChange, 400);
        this._onKeyPress = (e) => {
            if (e.keyCode === 27) { // escape key
                this.setState({
                    search_keyword: "",
                    search_input_visible: false,
                });
                if (this.$input.current) this.$input.current.blur();
                this.props.onSearch(null);
            } else if (e.ctrlKey && e.keyCode === 70) { // 'Ctrl F' shortcut to search
                e.preventDefault();
                this.setState({
                    search_input_visible: true,
                });
                if (this.$input.current) this.$input.current.focus();
            } else if (e.altKey && (e.keyCode === 49 || e.keyCode === 50)) { // 'alt 1' 'alt 2' shortcut
                e.preventDefault();
                this.onViewChange();
            }
        };
    }

    componentDidMount() {
        window.addEventListener("keydown", this._onKeyPress);
    }
    componentWillUnmount() {
        window.removeEventListener("keydown", this._onKeyPress);
    }

    onNew(type) {
        this.props.emit("new::"+type);
    }
    onDelete(arrayOfPaths) {
        prompt.now(
            t("Confirm by typing") + " \"remove\"",
            (answer) => {
                if (answer !== "remove") {
                    return Promise.resolve();
                }
                this.props.emit("file.delete.multiple", arrayOfPaths);
                return Promise.resolve();
            },
            () => {/* click on cancel */},
        );
    }
    onDownload(arrayOfPaths) {
        this.props.emit("file.download.multiple", arrayOfPaths);
    }

    onExtract(arrayOfPaths) {
        alert.now(<ExtractZipRequest
                      refresh={this.props.emit.bind(this, "file.refresh")}
                      paths={arrayOfPaths} />);
    }

    onViewChange() {
        requestAnimationFrame(() => this.props.onViewUpdate());
    }

    onSortChange(e) {
        this.props.onSortUpdate(e);
    }

    onSearchChange(search, e) {
        this.props.onSearch(search.trim());
    }

    onSearchToggle() {
        if (new Date() - this.search_last_toggle < 200) {
            // avoid bluring event cancelling out the toogle
            return;
        }
        if (this.$input.current) this.$input.current.focus();
        this.setState({
            search_input_visible: !this.state.search_input_visible,
        }, () => {
            if (this.state.search_input_visible == false) {
                this.props.onSearch(null);
                this.setState({ search_keyword: "" });
            }
        });
    }

    closeIfEmpty() {
        if (this.state.search_keyword.trim().length > 0) return;
        this.search_last_toggle = new Date();
        this.setState({
            search_input_visible: false,
            search_keyword: "",
        });
        this.props.onSearch(null);
    }

    onSearchKeypress(s, backpressure = true, e) {
        if (backpressure) {
            this.onSearchChange_Backpressure(s);
        } else {
            this.onSearchChange(s);
        }
        this.setState({ search_keyword: s });

        if (e && e.preventDefault) {
            e.preventDefault();
        }
    }

    onShareRequest(filename) {
        alert.now(
            <ShareComponent path={this.props.file.path} type={this.props.file.type} />,
            (ok) => {},
        );
    }

    render() {
        return (
            <div className={"component_submenu" + (this.props.selected.length > 0 || this.state.search_input_visible ? " sticky" : "")}>
                <Container>
                    <div className={"menubar no-select"+(this.state.search_input_visible ? " search_focus" : "")}>
                        <NgIf
                            className="button-new-file"
                            cond={this.props.accessRight.can_create_file !== false && this.props.selected.length === 0}
                            onClick={this.onNew.bind(this, "file")}
                            type="inline">
                            { window.innerWidth < 410 && t("New File").length > 10 ? t("New File", null, "NEW_FILE::SHORT") : t("New File") }
                        </NgIf>
                        <NgIf
                            className="button-new-folder"
                            cond={this.props.accessRight.can_create_directory !== false && this.props.selected.length === 0}
                            onClick={this.onNew.bind(this, "directory")}
                            type="inline">
                            { window.innerWidth < 410 && t("New Folder").length > 10 ? t("New Folder", null, "NEW_FOLDER::SHORT") : t("New Folder") }
                        </NgIf>
                        <NgIf
                            className="button-share"
                            cond={this.props.metadata.can_share !== false && window.CONFIG.enable_share === true && this.props.selected.length === 0}
                            onClick={this.onShareRequest.bind(this)}
                            type="inline">
                            { t("Share") }
                        </NgIf>
                        <NgIf
                            className="button-download"
                            cond={this.props.selected.length > 0}
                            type="inline"
                            onMouseDown={this.onDownload.bind(this, this.props.selected)}>
                            <ReactCSSTransitionGroup transitionName="submenuwithSelection" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={10000}>
                                <span>{ t("Download") }</span>
                            </ReactCSSTransitionGroup>
                        </NgIf>
                        <NgIf
                            className="button-remove"
                            cond={this.props.selected.length > 0 && this.props.accessRight.can_delete !== false}
                            type="inline"
                            onMouseDown={this.onDelete.bind(this, this.props.selected)}>
                            <ReactCSSTransitionGroup transitionName="submenuwithSelection" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={10000}>
                                <span>{ t("Remove") }</span>
                            </ReactCSSTransitionGroup>
                        </NgIf>
                        <NgIf
                            className="button-extract"
                            cond={/canary/.test(location.search) && this.props.selected.length === 1 && this.props.selected[0].replace(/.*\.([^\.]+)/, "$1") === "zip"}
                            type="inline"
                            onMouseDown={this.onExtract.bind(this, this.props.selected)}>
                            <ReactCSSTransitionGroup transitionName="submenuwithSelection" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={10000}>
                                <span>{ t("Extract") }</span>
                            </ReactCSSTransitionGroup>
                        </NgIf>

                        {
                            this.props.selected.length === 0 && (
                                <React.Fragment>
                                    <Dropdown
                                        className="view sort"
                                        onChange={this.onSortChange.bind(this)}>
                                        <DropdownButton>
                                            <Icon name="sort"/>
                                        </DropdownButton>
                                        <DropdownList>
                                            <DropdownItem
                                                name="type"
                                                icon={this.props.sort === "type" ? "check" : null}>
                                                { t("Sort By Type") }
                                            </DropdownItem>
                                            <DropdownItem
                                                name="date"
                                                icon={this.props.sort === "date" ? "check" : null}>
                                                { t("Sort By Date") }
                                            </DropdownItem>
                                            <DropdownItem
                                                name="name"
                                                icon={this.props.sort === "name" ? "check" : null}>
                                                { t("Sort By Name") }
                                            </DropdownItem>
                                        </DropdownList>
                                    </Dropdown>
                                    <div
                                        className="view list-grid"
                                        onClick={this.onViewChange.bind(this)}>
                                        <Icon name={this.props.view === "grid" ? "list" : "grid"}/>
                                    </div>
                                    <div className="view">
                                        <form onSubmit={(e) => this.onSearchKeypress(this.state.search_keyword, false, e)}>
                                            <label className="view search" onClick={this.onSearchToggle.bind(this, null)}>
                                                <NgIf cond={this.state.search_input_visible !== true}>
                                                    <Icon name="search_dark"/>
                                                </NgIf>
                                                <NgIf cond={this.state.search_input_visible === true}>
                                                    <Icon name="close_dark"/>
                                                </NgIf>
                                            </label>
                                            <NgIf cond={this.state.search_input_visible !== null} type="inline">
                                                <input
                                                    ref={this.$input}
                                                    onBlur={this.closeIfEmpty.bind(this, false)}
                                                    style={{ "width": this.state.search_input_visible ? "180px" : "0px" }}
                                                    value={this.state.search_keyword}
                                                    onChange={(e) => this.onSearchKeypress(e.target.value, true)}
                                                    type="text"
                                                    id="search"
                                                    placeholder={ t("search") }
                                                    name="search"
                                                    autoComplete="off" />
                                                <label htmlFor="search" className="hidden">{ t("search") }</label>
                                            </NgIf>
                                        </form>
                                    </div>
                                </React.Fragment>
                            )
                        }
                    </div>
                </Container>
            </div>
        );
    };
}

SubmenuComponent.propTypes = {
    accessRight: PropTypes.object,
    onSortUpdate: PropTypes.func.isRequired,
    sort: PropTypes.string.isRequired,
};


function ExtractZipRequest({ paths, refresh }) {
    const [error, setError] = useState(null);
    useEffect(() => {
        const controller = new AbortController();
        Files.unzip(paths, controller.signal)
            .then((a) => {
                refresh();
                document.querySelector("#modal-box").click();
            })
            .catch((err) => {
                refresh();
                setError(t(err && err.message))
            });
        return () => controller.abort();
    }, []);
    return (
        <div>
            {
                error === null ? (
                    <React.Fragment>
                        <style>{`
                           .component_modal button { opacity: 0 }
                           .component_modal .component_loader { margin: 30px 0 0 0; }
                        `}</style>
                        <Loader />
                    </React.Fragment>
                ) : (
                    <div>{ error }</div>
                )
            }
        </div>
    )
}

export const Submenu = EventEmitter(SubmenuComponent);
