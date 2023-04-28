import React, { createRef } from "react";
import { DragDropContext } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend-filedrop";

import "./filespage.scss";
import "./error.scss";
import { Files, Tags } from "../model/";
import {
    sort, onCreate, onRename, onMultiRename, onDelete, onMultiDelete,
    onMultiDownload, onUpload, onSearch,
} from "./filespage.helper";
import { NgIf, NgShow, Loader, EventReceiver, LoggedInOnly, ErrorPage } from "../components/";
import { notify, settings_get, settings_put } from "../helpers/";
import { BreadCrumb, FileSystem, FrequentlyAccess, Submenu, Sidebar } from "./filespage/";
import { MobileFileUpload } from "./filespage/filezone";
import InfiniteScroll from "react-infinite-scroller";
import { t } from "../locales/";

const PAGE_NUMBER_INIT = 2;
const LOAD_PER_SCROLL = 48;

// usefull when user press the back button while keeping the current context
const LAST_PAGE_PARAMS = {
    path: null,
    scroll: 0,
    page_number: PAGE_NUMBER_INIT,
};

export class FilesPageComponent extends React.Component {
    constructor(props) {
        super(props);
        if (props.match.url.slice(-1) != "/") {
            this.props.history.push(props.match.url + "/");
        }
        this.state = {
            path: (decodeURIComponent(location.pathname).replace("/files", "") || "/" ),
            sort: settings_get("filespage_sort") || CONFIG["default_sort"] || "type",
            sort_reverse: true,
            show_hidden: settings_get("filespage_show_hidden") || CONFIG["display_hidden"],
            view: settings_get("filespage_view") || CONFIG["default_view"] || "grid",
            is_search: false,
            files: [],
            selected: [],
            permissions: null,
            frequents: null,
            tags: null,
            page_number: PAGE_NUMBER_INIT,
            loading: true,
        };
        this.$scroll = createRef();

        this.observers = [];
        this.shortcut = this.shortcut.bind(this);
    }

    componentDidMount() {
        this.onRefresh(this.state.path, "directory");

        // subscriptions
        this.props.subscribe("file.create", function() {
            return onCreate.apply(this, arguments).then(() => {
                if (this.state.permissions && this.state.permissions.refresh_on_create === true) {
                    this.onRefresh(this.state.path, "directory");
                }
                return Promise.resolve();
            });
        }.bind(this));
        this.props.subscribe("file.upload", onUpload.bind(this));
        this.props.subscribe("file.rename", onRename.bind(this));
        this.props.subscribe("file.rename.multiple", onMultiRename.bind(this));
        this.props.subscribe("file.delete", onDelete.bind(this));
        this.props.subscribe("file.delete.multiple", onMultiDelete.bind(this));
        this.props.subscribe("file.download.multiple", onMultiDownload.bind(this));
        this.props.subscribe("file.refresh", this.onRefresh.bind(this));
        this.props.subscribe("file.select", this.toggleSelect.bind(this));
        window.addEventListener("keydown", this.shortcut);
    }

    componentWillUnmount() {
        this.props.unsubscribe("file.upload");
        this.props.unsubscribe("file.create");
        this.props.unsubscribe("file.rename");
        this.props.unsubscribe("file.delete");
        this.props.unsubscribe("file.delete.multiple");
        this.props.unsubscribe("file.refresh");
        this.props.unsubscribe("file.select");
        window.removeEventListener("keydown", this.shortcut);
        this._cleanupListeners();

        LAST_PAGE_PARAMS.path = this.state.path;
        LAST_PAGE_PARAMS.scroll = this.$scroll.current.scrollTop;
        LAST_PAGE_PARAMS.page_number = this.state.page_number;
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        const new_path = function(path) {
            if (path === undefined) path = "/";
            if (/\/$/.test(path) === false) path = path + "/";
            if (/^\//.test(path) === false) path = "/"+ path;
            return path;
        }((nextProps.match.params.path || "")
            .replace(/%23/g, "#")
            .replace(/%3F/g, "?")
            .replace(/%25/g, "%"));
        if (new_path !== this.state.path) {
            this.setState({ path: new_path, loading: true });
            this.onRefresh(new_path);
        }
    }

    shortcut(e) {
        if (e.code === "KeyH" && e.ctrlKey === true) {
            e.preventDefault();
            this.setState({ show_hidden: !this.state.show_hidden }, () => {
                settings_put("filespage_show_hidden", this.state.show_hidden);
                if (!!this.state.show_hidden) {
                    notify.send(t("Display hidden files"), "info");
                } else {
                    notify.send(t("Hide hidden files"), "info");
                }
            });
            this.onRefresh();
        } else if (e.code === "KeyA" && e.ctrlKey === true && document.activeElement.tagName !== "INPUT") {
            if (this.state.selected.length === this.state.files.length) {
                this.handleMultiSelect([], e);
            } else {
                this.handleMultiSelect(this.state.files, e);
            }
            requestAnimationFrame(() => document.getSelection().removeAllRanges());
        }
    }

    onRefresh(path = this.state.path) {
        this._cleanupListeners();
        const observer = Files.ls(path, this.state.show_hidden).subscribe((res) => {
            if (res.status !== "ok") {
                return;
            }
            this.setState({
                permissions: res.permissions,
                files: sort(res.results, this.state.sort),
                selected: [],
                loading: false,
                is_search: false,
                page_number: function() {
                    if (this.state.path === LAST_PAGE_PARAMS.path) {
                        return LAST_PAGE_PARAMS.page_number;
                    }
                    return PAGE_NUMBER_INIT;
                }.bind(this)(),
            }, () => {
                if (this.state.path === LAST_PAGE_PARAMS.path) {
                    this.$scroll.current.scrollTop = LAST_PAGE_PARAMS.scroll;
                }
            });
        }, (error) => this.props.error(error));
        this.observers.push(observer);
        if (path === "/") {
            Promise.all([Files.frequents(), Tags.all()])
                .then(([s, t]) => {
                    this.setState({ frequents: s, tags: t });
                });
        }
    }

    _cleanupListeners() {
        if (this.observers.length > 0) {
            this.observers = this.observers.filter((observer) => {
                observer.unsubscribe();
                return false;
            });
        }
    }

    onSort(_sort) {
        settings_put("filespage_sort", _sort);
        const same_sort = _sort === this.state.sort;
        this.setState({
            sort: _sort,
        }, () => {
            requestAnimationFrame(() => {
                let files = sort(this.state.files, _sort);
                if (same_sort && this.state.sort_reverse) files = files.reverse();
                this.setState({
                    page_number: PAGE_NUMBER_INIT,
                    sort_reverse: same_sort ? !this.state.sort_reverse : true,
                    files: files,
                });
            });
        });
    }

    onView() {
        const _view = this.state.view === "list" ? "grid" : "list";
        settings_put("filespage_view", _view);
        this.setState({
            view: _view,
        }, () => {
            requestAnimationFrame(() => {
                this.setState({
                    page_number: PAGE_NUMBER_INIT,
                });
            });
        });
    }

    onSearch(search) {
        if (search == null || search.length === 0) {
            this.onRefresh();
            return;
        }
        if (search.length < 2) {
            return;
        }
        if (this._search) {
            this._search.unsubscribe();
        }
        this.setState({
            files: [],
            loading: true,
            is_search: true,
            page_number: PAGE_NUMBER_INIT,
        });
        this._search = onSearch(search, this.state.path, this.state.show_hidden).subscribe((f = []) => {
            this.setState({
                files: sort(f, this.state.sort),
                loading: false,
                permissions: {
                    can_rename: false,
                    can_delete: false,
                    can_share: false,
                },
            });
        }, (err) => {
            this.setState({
                loading: false,
                permissions: {
                    can_rename: false,
                    can_delete: false,
                    can_share: false,
                },
            });
            notify.send(err, "error");
        });
    }

    loadMore() {
        requestAnimationFrame(() => {
            const page_number = this.state.page_number + 1;
            this.setState({ page_number: page_number });
        });
    }

    handleMultiSelect(selectedFiles, e) {
        if (!e.target) {
            this.setState({ selected: selectedFiles.map((f) => f.path) });
            return;
        } else if (e.target.classList.contains("component_thing")) {
            return;
        }
        this.handleMultiSelect(selectedFiles, {target: e.target.parentElement});
        return;
    }

    toggleSelect(path) {
        const idx = this.state.selected.indexOf(path);
        if (idx == -1) {
            this.setState({ selected: this.state.selected.concat([path]) });
        } else {
            this.state.selected.splice(idx, 1);
            this.setState({ selected: this.state.selected });
        }
    }

    render() {
        let $moreLoading = (
            <div className="infinite_scroll_loading" key={-1}>
                <Loader/>
            </div>
        );
        if (this.state.files.length <= this.state.page_number * LOAD_PER_SCROLL) {
            $moreLoading = null;
        }
        return (
            <div className="component_page_filespage">
                <BreadCrumb className="breadcrumb" path={this.state.path} currentSelection={this.state.selected} />
                <div onClick={(e) => this.handleMultiSelect([], e)} className="selectablegroup">
                    <div className="page_container">
                        <div ref={this.$scroll} className="scroll-y">
                            <InfiniteScroll
                                pageStart={0} loader={$moreLoading}
                                hasMore={this.state.files.length > 70}
                                initialLoad={false} useWindow={false}
                                loadMore={this.loadMore.bind(this)} threshold={100}>
                                {/* <Sidebar path={this.state.path}/> */}
                                <NgShow
                                    className="container"
                                    cond={!!this.state.is_search || !this.state.loading}>
                                    <NgIf cond={this.state.path === "/" && window.self === window.top}>
                                        <FrequentlyAccess tags={this.state.tags} files={this.state.frequents} />
                                    </NgIf>
                                    <Submenu
                                        path={this.state.path}
                                        sort={this.state.sort}
                                        view={this.state.view}
                                        onSearch={this.onSearch.bind(this)}
                                        onViewUpdate={(value) => this.onView(value)}
                                        onSortUpdate={(value) => this.onSort(value)}
                                        accessRight={this.state.permissions || {}}
                                        selected={this.state.selected} />
                                    <NgIf cond={!this.state.loading}>
                                        <FileSystem
                                            path={this.state.path} sort={this.state.sort}
                                            view={this.state.view} selected={this.state.selected}
                                            files={this.state.files.slice(0, this.state.page_number * LOAD_PER_SCROLL)}
                                            isSearch={this.state.is_search}
                                            metadata={this.state.permissions || {}}
                                            onSort={this.onSort.bind(this)}
                                            onView={this.onView.bind(this)} />
                                    </NgIf>
                                </NgShow>
                            </InfiniteScroll>
                            <NgIf cond={this.state.loading === true}>
                                <Loader/>
                            </NgIf>
                            <MobileFileUpload path={this.state.path} accessRight={this.state.permissions || {}} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export const FilesPage = ErrorPage(
    LoggedInOnly(
        EventReceiver(
            DragDropContext(HTML5Backend)(
                FilesPageComponent,
            ),
        ),
    ),
);
