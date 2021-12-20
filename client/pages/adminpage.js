import React, { useState, useEffect } from "react";
import { Route, Switch, NavLink, useRouteMatch } from "react-router-dom";

import "./error.scss";
import "./adminpage.scss";
import { Icon, LoadingPage, CSSTransition } from "../components/";
import { Admin } from "../model";
import { notify } from "../helpers/";
import {
    HomePage, BackendPage, SettingsPage, LogPage, SetupPage, LoginPage,
} from "./adminpage/";
import { t } from "../locales/";

function AdminOnly(WrappedComponent) {
    let initIsAdmin = null;
    return function(props) {
        const [isAdmin, setIsAdmin] = useState(initIsAdmin);

        const refresh = () => {
            Admin.isAdmin().then((t) => {
                initIsAdmin = t;
                setIsAdmin(t);
            }).catch((err) => {
                notify.send("Error: " + (err && err.message), "error");
            });
        };

        useEffect(() => {
            refresh();
            const timeout = window.setInterval(refresh, 5 * 1000);
            return () => clearInterval(timeout);
        }, []);

        if (isAdmin === true) {
            return ( <WrappedComponent {...props} /> );
        } else if (isAdmin === false) {
            return ( <LoginPage reload={refresh} /> );
        }

        return ( <LoadingPage /> );
    };
}

export default AdminOnly((props) => {
    const match = useRouteMatch();
    const [isSaving, setIsSaving] = useState(false);
    return (
        <div className="component_page_admin">
            <SideMenu url={match.url} isLoading={isSaving}/>
            <div className="page_container scroll-y">
                <CSSTransition key={location.pathname} transitionName="adminpage"
                    transitionAppearTimeout={30000}>
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
                            render={() =><LogPage isSaving={setIsSaving}/>} />
                        <Route path={match.url + "/setup"} component={SetupPage} />
                        <Route path={match.url} component={HomePage} />
                    </Switch>
                </CSSTransition>
            </div>
        </div>
    );
});

function SideMenu(props) {
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
                        <img src="/assets/logo/android-chrome-512x512.png" />
                    </NavLink>
                )
            }
            <h2>{ t("Admin console") }</h2>
            <ul>
                <li>
                    <NavLink activeClassName="active" to={props.url + "/backend"}>
                        { t("Backend") }
                    </NavLink>
                </li>
                <li>
                    <NavLink activeClassName="active" to={props.url + "/settings"}>
                        { t("Settings") }
                    </NavLink>
                </li>
                <li>
                    <NavLink activeClassName="active" to={props.url + "/logs"}>
                        { t("Logs") }
                    </NavLink>
                </li>
            </ul>
        </div>
    );
};
