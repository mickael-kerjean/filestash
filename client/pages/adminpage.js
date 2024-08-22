import React, { useState, useEffect } from "react";
import { Route, Switch, NavLink, useRouteMatch } from "react-router-dom";

import "./error.scss";
import "./adminpage.scss";
import { Icon, LoadingPage, CSSTransition, ErrorPage } from "../components/";
import { Admin } from "../model";
import { notify } from "../helpers/";
import { t } from "../locales/";

import {
    HomePage, BackendPage, SettingsPage, AboutPage, LogPage, SetupPage, LoginPage,
} from "./adminpage/";

function AdminOnly(WrappedComponent) {
    let initIsAdmin = null;
    return function AdminOnlyComponent(props) {
        const [isAdmin, setIsAdmin] = useState(initIsAdmin);

        const refresh = () => {
            Admin.isAdmin().then((r) => {
                initIsAdmin = r;
                setIsAdmin(r);
            }).catch((err) => {
                if (err.code === "INTERNAL_SERVER_ERROR") {
                    props.error({message: t("Cannot establish a connection")})
                    return;
                }
                notify.send("Error: " + (err && err.message), "error");
                setIsAdmin(false);
            });
        };

        useEffect(() => {
            refresh();
            const timeout = window.setInterval(refresh, 5 * 1000);
            return () => clearInterval(timeout);
        }, []);

        if (isAdmin === true || /\/admin\/setup$/.test(location.pathname)) {
            return ( <WrappedComponent {...props} /> );
        } else if (isAdmin === false) {
            return ( <LoginPage reload={refresh} /> );
        }
        return ( <LoadingPage /> );
    };
}

export default ErrorPage(AdminOnly((props) => {
    const match = useRouteMatch();
    const [isSaving, setIsSaving] = useState(false);
    return (
        <div className="component_page_admin">
            <SideMenu url={match.url} isLoading={isSaving}/>
            <div className="page_container scroll-y">
                <Switch>
                    <Route
                        path={match.url + "/backend"}
                        render={()=> <BackendPage isSaving={setIsSaving}/>}
                    />
                    <Route
                        path={match.url + "/settings"}
                        render={()=> <SettingsPage isSaving={setIsSaving}/>}
                    />
                    <Route
                        path={match.url + "/logs"}
                        render={() => <LogPage isSaving={setIsSaving}/>} />
                    <Route
                        path={match.url + "/about"}
                        render={() => <AboutPage />} />
                    <Route path={match.url + "/setup"} component={SetupPage} />
                    <Route path={match.url} component={HomePage} />
                </Switch>
            </div>
        </div>
    );
}));

function SideMenu(props) {
    const [version, setVersion] = useState(null);
    useEffect(() => {
        const controller = new AbortController();
        fetch(window.globalConfig.BaseUrl + "/about", { signal: controller.signal }).then((r) => {
            setVersion(r.headers.get("X-Powered-By").replace(/^Filestash\/([v\.0-9]*).*$/, "$1"))
        })
        return () => controller.abort();
    }, []);
    return (
        <div className="component_menu_sidebar no-select">
            {
                props.isLoading ? (
                    <div className="header">
                        <Icon name="arrow_left" style={{ "opacity": 0 }}/>
                        <Icon name="loading" />
                    </div>
                ) : (
                    <NavLink to="/" className="header">
                        <Icon name="arrow_left" />
                        <img src= {window.globalConfig.BaseUrl + "/assets/logo/android-chrome-512x512.png"} />
                    </NavLink>
                )
            }
            <h2>Admin console</h2>
            <ul>
                <li>
                    <NavLink activeClassName="active" to={props.url + "/backend"}>
                        Backend
                    </NavLink>
                </li>
                <li>
                    <NavLink activeClassName="active" to={props.url + "/settings"}>
                        Settings
                    </NavLink>
                </li>
                <li>
                    <NavLink activeClassName="active" to={props.url + "/logs"}>
                        Logs
                    </NavLink>
                </li>
                <li className="version">
                    <NavLink activeClassName="active" to={props.url + "/about"}>
                        { version }
                    </NavLink>
                </li>
            </ul>
        </div>
    );
};
