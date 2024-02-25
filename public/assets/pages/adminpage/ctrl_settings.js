import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../../lib/rx.js";
import { qs, qsa } from "../../lib/dom.js";
import { createForm, mutateForm } from "../../lib/form.js";
import { formTmpl } from "../../components/form.js";
import { generateSkeleton } from "../../components/skeleton.js";
import { get as getConfig } from "../../model/config.js";
import ctrlError from "../ctrl_error.js";

import { get as getAdminConfig, save as saveConfig, initConfig } from "./model_config.js";
import { renderLeaf, useForm$, formObjToJSON$ } from "./helper_form.js";
import transition from "./animate.js";
import AdminHOC from "./decorator.js";

export default AdminHOC(async function(render) {
    const $container = createElement(`
        <div class="component_settingspage sticky">
            <form data-bind="form" class="formbuilder">
                <h2>…</h2>
                ${generateSkeleton(10)}
            </form>
        </div>
    `);
    render(transition($container));
    await initConfig();

    const config$ = getAdminConfig().pipe(
        rxjs.first(),
        reshapeConfigBeforeDisplay,
    );

    const tmpl = formTmpl({
        renderNode: ({ level, format, label }) => {
            if (level !== 0) return null;
            return createElement(`
                <div>
                    <h2>${format(label)}</h2>
                    <div data-bind="children"></div>
                </div>
            `);
        },
        renderLeaf,
        autocomplete: false,
    });

    // feature: setup the form
    const init$ = config$.pipe(
        rxjs.mergeMap((formSpec) => createForm(formSpec, tmpl)),
        rxjs.map(($form) => [$form]),
        applyMutation(qs($container, "[data-bind=\"form\"]"), "replaceChildren"),
        rxjs.share(),
    );
    effect(init$);

    // feature: handle form change
    effect(init$.pipe(
        useForm$(() => qsa($container, "[data-bind=\"form\"] [name]")),
        rxjs.mergeMap((formState) => config$.pipe(
            rxjs.first(),
            rxjs.map((formSpec) => mutateForm(formSpec, formState)),
        )),
        reshapeConfigBeforeSave,
        saveConfig(),
        rxjs.catchError(ctrlError()),
    ));
});

// the config contains stuff wich we don't want to show in this page such as:
// - the middleware info which is set in the backend page
// - the connections info which is set in the backend page
// - the constant info which is for the setup page
const reshapeConfigBeforeDisplay = rxjs.map((cfg) => {
    const { constant, middleware, connections, ...other } = cfg;
    return other;
});

// before saving things back to the server, we want to hydrate the config and insert back:
// - the middleware info
// - the connections info
const reshapeConfigBeforeSave = rxjs.pipe(
    rxjs.mergeMap((configWithMissingKeys) => getAdminConfig().pipe(
        rxjs.first(),
        rxjs.map((config) => {
            configWithMissingKeys["middleware"] = config["middleware"];
            return configWithMissingKeys;
        }),
        formObjToJSON$(),
    )),
    rxjs.mergeMap((adminConfig) => getConfig().pipe(
        rxjs.first(),
        rxjs.map((publicConfig) => {
            adminConfig["connections"] = publicConfig["connections"];
            return adminConfig;
        }),
    )),
);
