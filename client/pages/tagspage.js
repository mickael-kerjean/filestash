import React, { useState, useEffect } from "react";
import { Redirect } from "react-router";
import { Link } from "react-router-dom";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";
import {
    NgIf, NgShow, Loader, LoggedInOnly, BreadCrumb, Card, Icon,
} from "../components/";
import { URL_TAGS, URL_FILES, URL_VIEWER, basename, filetype } from "../helpers/";
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
    }, [match.url]);

    if(match.url.slice(-1) != "/") {
        return (<Redirect to={match.url + "/"} />);
    }

    const isAFolder = (_path) => (filetype(_path) === "directory");

    return (
        <div className="component_page_tag">
            <BreadCrumb className="breadcrumb" path={path} baseURL={URL_TAGS} />
            <div className="page_container">
                <div className="scroll-y">
                    <div className="component_submenu">
                        <div className="component_container">
                            <div className="menubar">
                                <div className="view list-grid" onClick={Tags.export}>
                                    <Icon name="download_white" />
                                </div>
                                <div className="view list-grid" onClick={Tags.import}>
                                    <Icon name="upload_white" />
                                </div>
                            </div>
                        </div>
                    </div>
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
