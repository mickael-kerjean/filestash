import main from "./lib/skeleton/index.js";
import routes from "./boot/router_backoffice.js";

main(document.getElementById("app"), routes, {
    spinner: "<component-loader></component-loader>",
    beforeStart: import("./boot/ctrl_boot_backoffice.js"),
});
