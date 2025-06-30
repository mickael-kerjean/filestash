import rxjs from "../../lib/rx.js";
import { get as getAdminConfig } from "./model_config.js";
import { formObjToJSON$ } from "./helper_form.js";

export function getDeps() {
    return getAdminConfig().pipe(
        formObjToJSON$(),
        rxjs.map(({ constant }) => ([
            {
                name_success: "SSL is configured properly",
                name_failure: "SSL is not configured properly",
                pass: window.location.protocol !== "http:",
                severe: true,
                message: "You should enable SSL/TLS so every request is encrypted in transit",
            }, {
                name_success: "Application is not running as root but '" + constant.user + "'",
                name_failure: "Application is running as root",
                pass: constant.user !== "root",
                severe: true,
                message: "you should use a low privilege user instead",
            }, {
                name_success: "You are running Filestash enterprise",
                name_failure: "AGPL Community licence detected",
                pass: constant.license !== "agpl",
                message: "For production usage in a commercial environment, you should upgrade to Filestash enterprise",
            }
        ])),
    );
}
