import React, { useState, useEffect } from "react";
import { Redirect } from "react-router";
import { Link } from "react-router-dom";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";
import {
    NgIf, NgShow, Loader, LoggedInOnly, BreadCrumb, Card, Icon,
    Dropdown, DropdownButton, DropdownList, DropdownItem,
} from "../components/";
import { URL_TAGS, URL_FILES, URL_VIEWER, basename, filetype, prompt, notify } from "../helpers/";
import { Tags } from "../model/";
import { t } from "../locales/";

import "./tagspage.scss";
import "./filespage.scss";
import "./filespage/thing.scss";
import "./filespage/submenu.scss";

export function TagsPageComponent({ match }) {
    const [tags, setTags] = useState(null);
    const [files, setFiles] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);

    const path = (match.url.replace(URL_TAGS, "") || "/");
    useEffect(() => {
        setLoading(true);
        setTags(null);
        setFiles(null);

        Promise.all([Tags.all(path), Tags.files(path)]).then(([t, f]) => {
            setLoading(false);
            setTags(t);
            setFiles(f);
        });
    }, [match.url, refresh]);

    if(match.url.slice(-1) != "/") {
        return (<Redirect to={match.url + "/"} />);
    }

    const onClickRemoveFile = (file) => {
        prompt.now(
            t("Confirm by typing") + ": remove",
            () => {
                Tags.removeTagFromFile(
                    path.split("/").filter((r) => !!r).slice(-1)[0],
                    file,
                );
                setRefresh(refresh + 1);
                return Promise.resolve();
            },
            () => {},
        );
    }

    const onClickMoreDropdown = (what) => {
        switch(what) {
        case "import":
            let $input = document.getElementById("import_tags");
            $input.click();
            $input.onchange = () => {
                if($input.files.length === 0) {
                    return;
                }
                const reader = new FileReader();
                reader.onload = function () {
                    let jsonObject = null;
                    try {
                        jsonObject = JSON.parse(reader.result);
                    } catch (err) {
                        notify.send(t("Not Valid"), "error");
                        return;
                    }
                    if(JSON.stringify(Object.keys(jsonObject)) !== JSON.stringify(["tags", "weight", "share", "backend"])) {
                        notify.send(t("Not Valid"), "error");
                        return;
                    }
                    setLoading(true);
                    Tags.import(jsonObject).then(() => {
                        setLoading(false);
                        setRefresh(refresh + 1);
                    }).catch((err) => {
                        setLoading(false);
                    });
                };
                reader.readAsText($input.files[0]);
            };
            break;
        case "export":
            Tags.export().then((db) => {
                const $link = document.getElementById("export_tags");
                $link.href = window.URL.createObjectURL(new Blob([JSON.stringify(db, null, 4)]));
                $link.click();
                window.URL.revokeObjectURL($link.href);
            }).catch((err) => notify.send(err, "error"));
            break;
        }
    }

    const isAFolder = (_path) => (filetype(_path) === "directory");

    return (
        <div className="component_page_tag">
            <BreadCrumb className="breadcrumb" path={path} baseURL={URL_TAGS} />
            <div className="page_container">
                <div className="scroll-y">
                    <div className="component_submenu">
                        <div className="component_container">
                            <h1>
                                {
                                    path.split("/").filter((r) => r).map((tag, idx) => (
                                        <React.Fragment key={idx}>#{tag} </React.Fragment>
                                    ))
                                }
                            </h1>
                            <div className="menubar">
                                <Dropdown
                                    className="view"
                                    onChange={onClickMoreDropdown}>
                                    <DropdownButton>
                                        <Icon name="more"/>
                                    </DropdownButton>
                                    <DropdownList>
                                        <DropdownItem name="import">
                                            { t("Import Tags") }
                                        </DropdownItem>
                                        <DropdownItem name="export">
                                            { t("Export Tags") }
                                        </DropdownItem>
                                    </DropdownList>
                                </Dropdown>
                                <form style={{display:"none"}}><input type="file" id="import_tags" /></form>
                                <div style={{display:"none"}}><a id="export_tags" download="tags.json"></a></div>
                            </div>
                        </div>
                    </div>
                    <br style={{clear: "both"}}/>
                    <NgShow className="component_container" cond={!loading}>
                        <NgIf cond={!loading} className="list">
                            <ReactCSSTransitionGroup
                                transitionName="filelist-item" transitionLeave={false}
                                transitionEnter={false} transitionAppear={true}
                                transitionAppearTimeout={200}>
                                {
                                    tags && tags.map((tag) => (
                                        <div className="component_thing view-grid" key={tag}>
                                            <Link to={URL_TAGS + path + tag + "/"}>
                                                <Card>
                                                    <span><Icon name="directory" /></span>
                                                    <span className="component_filename">
                                                        <span className="file-details">{tag}</span>
                                                    </span>
                                                </Card>
                                            </Link>
                                        </div>
                                    ))
                                }
                            </ReactCSSTransitionGroup>
                        </NgIf>
                        {
                            tags && tags.length > 0 && (
                                <div style={{marginTop: "30px"}}/>
                            )
                        }
                        <NgIf cond={!loading} className="list">
                            <ReactCSSTransitionGroup
                                transitionName="filelist-item" transitionLeave={false}
                                transitionEnter={false} transitionAppear={true}
                                transitionAppearTimeout={200}>
                                {
                                    files && files.map((file, idx) => (
                                        <div className="component_thing view-list" key={idx}>
                                            <Link to={(isAFolder(file) ? URL_FILES : URL_VIEWER) + file}>
                                                <Card>
                                                    <span className="component_action" style={{float: "right"}} onClick={(e) => { e.preventDefault(); onClickRemoveFile(file)}}>
                                                        <Icon name="close" />
                                                    </span>
                                                    <span><Icon name={filetype(file)} /></span>
                                                    <span className="component_filename">
                                                        <span className="file-details">
                                                            {basename(file)} <br/><i>{file}</i>
                                                        </span>
                                                    </span>
                                                </Card>
                                            </Link>
                                        </div>
                                    ))
                                }
                            </ReactCSSTransitionGroup>
                        </NgIf>
                        <NgIf className="error" cond={!!files && files.length === 0}>
                            <p className="empty_image">
                                <Icon name="empty_folder" />
                            </p>
                            <p className="label">{ t("There is nothing here") }</p>
                        </NgIf>
                    </NgShow>
                    <NgIf cond={loading}>
                        <Loader/>
                    </NgIf>
                </div>
            </div>
        </div>
    );
}

export const TagsPage = LoggedInOnly(
    TagsPageComponent,
);
