/* eslint-disable react/jsx-no-target-blank */
import React from "react";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";
import { withRouter } from "react-router";
import { Subject } from "rxjs/Subject";

import {
    NgIf, Fab, Icon, Dropdown, DropdownButton, DropdownList, DropdownItem,
} from "../../components/";
import { confirm, currentShare } from "../../helpers/";
import { Editor } from "./editor";
import { MenuBar } from "./menubar";
import { OrgTodosViewer, OrgEventsViewer } from "./org_viewer";
import { t } from "../../locales/";

import "./ide.scss";

class IDEComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            event: new Subject(),
            contentToSave: props.content,
            appear_agenda: false,
            appear_todo: false,
            mode: null,
            folding: null,
        };
    }

    componentDidMount() {
        this.unblock = this.props.history.block((nextLocation)=> {
            if (this.props.needSaving === false) return true;
            confirm.now(
                <div style={{ textAlign: "center", paddingBottom: "5px" }}>
                    { t("Do you want to save the changes ?") }
                </div>,
                () =>{
                    return this.save()
                        .then(() => this.props.history.push(nextLocation));
                },
                () => {
                    this.props.needSavingUpdate(false)
                        .then(() => this.props.history.push(nextLocation));
                },
            );
            return false;
        });
    }
    componentWillUnmount() {
        this.unblock();
        window.clearInterval(this.state.id);
    }

    save() {
        if (this.props.needSaving === false) return;
        // the ipad is the new IE, they don't support the file object so we got to fallback :(
        return this.props.onSave(
            new window.Blob(
                [this.state.contentToSave],
                { type: "text/plain" },
            ),
        ).then(() => this.props.needSavingUpdate(false));
    }

    onUpdate(property, refresh, value) {
        this.setState({ [property]: value }, () => {
            if (refresh) {
                this.state.event.next(["refresh"]);
            }
            if (this.props.content === this.state.contentToSave) {
                this.props.needSavingUpdate(false);
            } else {
                this.props.needSavingUpdate(true);
            }
        });
    }

    /* Org Viewer specific stuff */
    toggleAgenda(force = null) {
        this.setState({
            appear_agenda: force === null ? !this.state.appear_agenda : !!force,
        });
    }
    toggleTodo(force = null) {
        this.setState({
            appear_todo: force === null ? !this.state.appear_todo : !!force,
        });
    }
    onModeChange() {
        this.state.event.next(["fold"]);
    }
    goTo(lineNumber) {
        this.state.event.next(["goTo", lineNumber]);
    }

    download() {
        document.cookie = "download=yes; path=/; max-age=120;";
        this.setState({
            refresh: Date.now(),
            id: window.setInterval(() => {
                if (/download=yes/.test(document.cookie) === false) {
                    window.clearInterval(this.state.id);
                    this.setState({ refresh: Date.now() });
                }
            }, 100),
        });
    }

    render() {
        const changeExt = function(filename, ext) {
            return filename.replace(/\.org$/, "."+ext);
        };

        return (
            <div className="component_ide">
                <MenuBar
                    title={this.props.filename}
                    download={this.state.mode === "orgmode" ? null : this.props.url}>
                    <NgIf type="inline" cond={this.state.mode === "orgmode"}>
                        <span onClick={this.onModeChange.bind(this)}>
                            <NgIf cond={this.state.folding === "SHOW_ALL"} type="inline">
                                <Icon name="arrow_up_double"/>
                            </NgIf>
                            <NgIf cond={this.state.folding === "OVERVIEW"} type="inline">
                                <Icon name="arrow_down"/>
                            </NgIf>
                            <NgIf cond={this.state.folding === "CONTENT"} type="inline">
                                <Icon name="arrow_down_double"/>
                            </NgIf>
                        </span>
                        <Dropdown
                            className="view sort"
                            onChange={() => this.download()}
                            enable={/download=yes/.test(document.cookie) ? false : true}>
                            <DropdownButton>
                                <Icon name={/download=yes/.test(document.cookie) ? "loading_white" : "download_white"} />
                            </DropdownButton>
                            <DropdownList>
                                <DropdownItem name="na"><a download={this.props.filename} href={this.props.url}>{ t("Save current file") }</a></DropdownItem>
                                <DropdownItem name="na"><a target={this.props.needSaving ? "_blank" : "_self"} href={"/api/export/"+(currentShare() || "private")+"/text/html"+this.props.path}>{ t("Export as {{VALUE}}", "HTML") }</a></DropdownItem>
                                <DropdownItem name="na"><a target={this.props.needSaving ? "_blank" : "_self"} href={"/api/export/"+(currentShare() || "private")+"/application/pdf"+this.props.path}>{ t("Export as {{VALUE}}", "PDF") }</a></DropdownItem>
                                <DropdownItem name="na"><a target={this.props.needSaving ? "_blank" : "_self"} href={"/api/export/"+(currentShare() || "private")+"/text/markdown"+this.props.path}>{ t("Export as {{VALUE}}", "Markdown") }</a></DropdownItem>
                                <DropdownItem name="na"><a target={this.props.needSaving ? "_blank" : "_self"} href={"/api/export/"+(currentShare() || "private")+"/text/plain"+this.props.path}>{ t("Export as {{VALUE}}", "TXT") }</a></DropdownItem>
                                <DropdownItem name="na"><a target={this.props.needSaving ? "_blank" : "_self"} download={changeExt(this.props.filename, "tex")} href={"/api/export/"+(currentShare() || "private")+"/text/x-latex"+this.props.path}>{ t("Export as {{VALUE}}", "Latex") }</a></DropdownItem>
                                <DropdownItem name="na"><a target={this.props.needSaving ? "_blank" : "_self"} download={changeExt(this.props.filename, "ics")} href={"/api/export/"+(currentShare() || "private")+"/text/calendar"+this.props.path}>{ t("Export as {{VALUE}}", "ical") }</a></DropdownItem>
                                <DropdownItem name="na"><a target={this.props.needSaving ? "_blank" : "_self"} download={changeExt(this.props.filename, "odt")} href={"/api/export/"+(currentShare() || "private")+"/application/vnd.oasis.opendocument.text"+this.props.path}>{ t("Export as {{VALUE}}", "Open office") }</a></DropdownItem>
                                <DropdownItem name="na"><a target={this.props.needSaving ? "_blank" : "_self"} download={changeExt(this.props.filename, "pdf")} href={"/api/export/"+(currentShare() || "private")+"/application/pdf"+this.props.path+"?mode=beamer"}>{ t("Export as {{VALUE}}", "Beamer") }</a></DropdownItem>
                            </DropdownList>
                        </Dropdown>

                        <span onClick={this.toggleAgenda.bind(this)}>
                            <Icon name="calendar_white"/>
                        </span>
                        <span onClick={this.toggleTodo.bind(this)}>
                            <Icon name="todo_white"/>
                        </span>
                    </NgIf>
                </MenuBar>

                <ReactCSSTransitionGroup
                    transitionName="editor" transitionAppear={true} transitionEnter={false}
                    transitionLeave={false} transitionAppearTimeout={300}
                    className="editor_container">
                    <Editor
                        onSave={this.save.bind(this)} filename={this.props.filename}
                        content={this.state.contentToSave}
                        readonly={/PUT/.test(this.props.acl)}
                        event={this.state.event.asObservable()}
                        onModeChange={this.onUpdate.bind(this, "mode", false)}
                        onFoldChange={this.onUpdate.bind(this, "folding", false)}
                        onChange={this.onUpdate.bind(this, "contentToSave", false)} />
                </ReactCSSTransitionGroup>

                <ReactCSSTransitionGroup
                    transitionName="fab" transitionLeave={true} transitionEnter={true}
                    transitionAppear={true} transitionAppearTimeout={400}
                    transitionEnterTimeout={400} transitionLeaveTimeout={200}>
                    <NgIf key={this.props.needSaving} cond={this.props.needSaving}>
                        <NgIf cond={!this.props.isSaving}>
                            <Fab onClick={this.save.bind(this)}>
                                <Icon name="save" style={{ height: "100%", width: "100%" }} />
                            </Fab>
                        </NgIf>
                        <NgIf cond={this.props.isSaving}>
                            <Fab>
                                <Icon name="loading" style={{ height: "100%", width: "100%" }} />
                            </Fab>
                        </NgIf>
                    </NgIf>
                </ReactCSSTransitionGroup>

                <OrgEventsViewer
                    isActive={this.state.appear_agenda} content={this.state.contentToSave}
                    onUpdate={this.onUpdate.bind(this, "contentToSave", true)}
                    goTo={this.goTo.bind(this)}
                    onQuit={this.toggleAgenda.bind(this, false)} />
                <OrgTodosViewer
                    isActive={this.state.appear_todo} content={this.state.contentToSave}
                    onUpdate={this.onUpdate.bind(this, "contentToSave", true)}
                    goTo={this.goTo.bind(this)}
                    onQuit={this.toggleTodo.bind(this, false)} />
            </div>
        );
    }
}

export const IDE = withRouter(IDEComponent);
