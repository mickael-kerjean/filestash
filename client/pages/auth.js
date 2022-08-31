import React from "react";
import "./connectpage.scss";
import { ErrorPage } from "../components/";
import config from "../config.json";


function AuthRedirection(props) {
    const meterid = props.match.params.id
    console.log(meterid)

    async function authenticate() {
        console.log("null")
        const ldapUrl = config.ldapUrl + meterid + '/'
        window.location.replace(ldapUrl);  
    }

    authenticate()

    return (<div>Redirecting to LDAP ...</div>)
}

export const LDAPAuth = ErrorPage(AuthRedirection);