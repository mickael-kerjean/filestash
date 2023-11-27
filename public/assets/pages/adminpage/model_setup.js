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
                message: "This can lead to data leaks. Please use a SSL certificate",
            }, {
                name_success: "Application is running as '" + constant.user.value + "'",
                name_failure: "Application is running as root",
                pass: constant.user !== "root",
                severe: true,
                message: "This is dangerous, you should use another user with less privileges",
            }, {
                name_success: "Emacs is installed",
                name_failure: "Emacs is not installed",
                pass: !!constant.emacs,
                severe: false,
                message: "If you want to use all the org-mode features of Filestash, you need to install emacs",
            }, {
                name_success: "Pdftotext is installed",
                name_failure: "Pdftotext is not installed",
                pass: !!constant.pdftotext,
                severe: false,
                message: "You won't be able to search through PDF documents without it",
            },
        ])),
    );
}
