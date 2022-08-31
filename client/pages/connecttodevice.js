import React, { useEffect } from "react";
import "./connectpage.scss";
import { Session } from "../model";
import { ErrorPage } from "../components";
import { cache } from "../helpers";
import { useHistory } from "react-router-dom";
import config from "../config.json";

function ConnectToMeter(props) {
    const history = useHistory();

    useEffect (() => {
        const authenticate = async (data) => {
            console.log("Waiting for form data")
            console.log(data)

            return Session.authenticate(data)
                .then(Session.currentUser)
                .then((user) => {
                    if (data["next"]) {
                        location = data["next"];
                        return;
                    }
                    let url = "/files/";
                    if (user["home"]) {
                        user["home"] = user["home"].replace(/^\/?(.*?)\/?$/, "$1").trim();
                        if (user["home"] !== "") url = `${url}${user["home"]}/`;
                    }
                    cache.destroy();
                    console.log(url)
                    history.push(url);
                });
        }

        console.log("Calling API")

        const meterid = props.match.params.id
        const token = props.match.params.token
        console.log(meterid)
        console.log(token)

        const orgServiceUrl = config.orgServices.replace("<meterId>", meterid).replace("<token>", token)
        fetch(orgServiceUrl)
            .then(res => {
                return res.json();
            })
            .then(data => {
                console.log(data)
                authenticate(data)
            })
        }, []);

    return (<div>Redirecting to home...</div>)
}

export const ConnectToDevice = ErrorPage(ConnectToMeter);