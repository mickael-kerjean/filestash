import React from "react";
import { Redirect } from "react-router";
import { NgIf, NgShow, Loader, LoggedInOnly, BreadCrumb, Card } from "../components/";
import { URL_TAGS } from "../helpers/";
import { t } from "../locales/";

import "./filespage.scss";

export function TagsPageComponent() {
    const loading = false;    
    const files = [1,2,3,4,5,6];
    let path = (decodeURIComponent(location.pathname).replace(URL_TAGS, "") || "/" );
    if (path == "/") {
        return ( <Redirect to={URL_TAGS + "/tags/"} /> );
    }
    
    console.log(path)
    return (
        <div className="component_page_filespage">
            <BreadCrumb className="breadcrumb" path={path} baseURL={URL_TAGS} />
            <div className="page_container">
                <div className="scroll-y">
                    <NgShow className="container" cond={!loading}>
                        <NgIf cond={!loading}>
                            {
                                files.map((file, idx) => {
                                    return (
                                        <div className={"component_thing"} key={idx}>
                                            <Card>
                                                { file }
                                            </Card>
                                        </div>
                                    );
                                })
                            }
                        </NgIf>
                    </NgShow>
                </div>
                <NgIf cond={loading}>
                    <Loader/>
                </NgIf>
            </div>
        </div>
    );
}

export const TagsPage = LoggedInOnly(
    TagsPageComponent,
);
