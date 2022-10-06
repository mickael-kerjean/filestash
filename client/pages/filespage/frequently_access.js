import React from "react";
import { Link } from "react-router-dom";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";

import { Container, Icon, NgIf } from "../../components/";
import { URL_TAGS, URL_FILES } from "../../helpers/";
import Path from "path";
import { t } from "../../locales/";

import "./frequently_access.scss";

export function FrequentlyAccess({ files, tags }) {
    let showPlaceholder = true;
    if (files === null || tags === null) showPlaceholder = false;
    else if (files && files.length > 0) showPlaceholder = false;
    else if(tags && tags.length > 0) showPlaceholder = false;

    return (
        <div className="component_frequently-access">
            <ReactCSSTransitionGroup
                transitionName="frequent-access" transitionLeave={false} transitionEnter={true}
                transitionAppear={true} transitionEnterTimeout={500}
                transitionAppearTimeout={300}>
                <Container key={files === null ? "nothing" : "something"}>
                    <NgIf cond={!!files && files.length > 0}>
                        <span className="caption">{t("Quick Access")}</span>
                        <div className="frequent_wrapper">
                            {
                                files && files.map((path, index) => {
                                    return (
                                        <Link
                                            key={path}
                                            to={URL_FILES+path+window.location.search}>
                                            <Icon name={"directory"} />
                                            <div>{Path.basename(path)}</div>
                                        </Link>
                                    );
                                })
                            }
                        </div>
                    </NgIf>
                   <NgIf cond={!!tags && tags.length > 0}>
                     <Link className="caption" to={URL_TAGS}>{t("Tag")}</Link>
                        <div className="frequent_wrapper">
                            {
                                tags && tags.map((tag, index) => {
                                    return (
                                        <Link
                                            key={tag}
                                            to={"/tags/" + tag}>
                                            <Icon name={"directory"} />
                                            <div>{tag}</div>
                                        </Link>
                                    );
                                })
                            }
                        </div>
                    </NgIf>
                    <NgIf
                        cond={showPlaceholder}
                        className="nothing_placeholder">
                        <svg aria-hidden="true" focusable="false" data-icon="layer-group" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                            <path fill="currentColor" d="M12.41 148.02l232.94 105.67c6.8 3.09 14.49 3.09 21.29 0l232.94-105.67c16.55-7.51 16.55-32.52 0-40.03L266.65 2.31a25.607 25.607 0 0 0-21.29 0L12.41 107.98c-16.55 7.51-16.55 32.53 0 40.04zm487.18 88.28l-58.09-26.33-161.64 73.27c-7.56 3.43-15.59 5.17-23.86 5.17s-16.29-1.74-23.86-5.17L70.51 209.97l-58.1 26.33c-16.55 7.5-16.55 32.5 0 40l232.94 105.59c6.8 3.08 14.49 3.08 21.29 0L499.59 276.3c16.55-7.5 16.55-32.5 0-40zm0 127.8l-57.87-26.23-161.86 73.37c-7.56 3.43-15.59 5.17-23.86 5.17s-16.29-1.74-23.86-5.17L70.29 337.87 12.41 364.1c-16.55 7.5-16.55 32.5 0 40l232.94 105.59c6.8 3.08 14.49 3.08 21.29 0L499.59 404.1c16.55-7.5 16.55-32.5 0-40z"></path>
                        </svg>
                        { t("Frequently access folders will be shown here") }
                    </NgIf>
                </Container>
            </ReactCSSTransitionGroup>
        </div>
    );
}
