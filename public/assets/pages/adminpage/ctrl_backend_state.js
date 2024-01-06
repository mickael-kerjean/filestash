import rxjs from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { ApplicationError } from "../../lib/error.js";
import { get as getConfig } from "../../model/config.js";
import { get as getAdminConfig } from "./model_config.js";
import { formObjToJSON$ } from "./helper_form.js";

export { getBackends as getBackendAvailable } from "./model_backend.js";

const backendsEnabled$ = new rxjs.ReplaySubject(1);

export async function initStorage() {
    return await getConfig().pipe(
        rxjs.map(({ connections }) => connections),
        rxjs.tap((connections) => backendsEnabled$.next(Array.isArray(connections) ? connections : [])),
    ).toPromise();
}

export function getBackendEnabled() {
    return backendsEnabled$.asObservable();
}

export function addBackendEnabled(type) {
    return backendsEnabled$.pipe(
        rxjs.first(),
        rxjs.map((backends) => {
            const existingLabels = new Set();
            backends.forEach((obj) => {
                existingLabels.add(obj.label.toLowerCase());
            });

            let label = ""; let i = 1;
            while (true) {
                label = type + (i === 1 ? "" : ` ${i}`);
                if (existingLabels.has(label) === false) break;
                i += 1;
            }

            const b = backends.concat({ type, label });
            backendsEnabled$.next(b);
            return b;
        }),
    );
}

export function removeBackendEnabled(labelToRemove) {
    return backendsEnabled$.pipe(
        rxjs.first(),
        rxjs.map((backends) => {
            const b = backends.filter(({ label }) => label !== labelToRemove);
            backendsEnabled$.next(b);
            return b;
        }),
    );
}

const middlewareEnabled$ = new rxjs.ReplaySubject(1);

export async function initMiddleware() {
    return await getAdminConfig().pipe(
        rxjs.map(({ middleware }) => middleware),
        formObjToJSON$(),
        rxjs.tap(({ identity_provider }) => middlewareEnabled$.next(identity_provider.type)),
        rxjs.first(),
    ).toPromise();
}

export { getAuthMiddleware as getMiddlewareAvailable } from "./model_auth_middleware.js";

export function getMiddlewareEnabled() {
    return middlewareEnabled$.asObservable();
}

export function toggleMiddleware(type) {
    const newValue = middlewareEnabled$.value === type ? null : type;
    middlewareEnabled$.next(newValue);
    return newValue;
}

export function getState() {
    return getAdminConfig().pipe(
        rxjs.first(),
        formObjToJSON$(),
        rxjs.map((config) => { // connections
            const connections = [];
            const formData = new FormData(qs(document.body, "[data-bind=\"backend-enabled\"]"));
            for (const [type, label] of formData.entries()) {
                connections.push({ type, label });
            }
            config.connections = connections;
            return config;
        }),
        rxjs.map((config) => { // middleware
            const authType = document
                .querySelector("[data-bind=\"authentication_middleware\"] [is=\"box-item\"].active")
                ?.getAttribute("data-label");

            config.middleware = {
                identity_provider: { type: null },
                attribute_mapping: null,
            };
            if (!authType) return config;

            const $formIDP = document.querySelector("[data-bind=\"idp\"]");
            if (!($formIDP instanceof window.HTMLFormElement)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: idp isn't a form");
            let formValues = [...new FormData($formIDP)];
            config.middleware.identity_provider = {
                type: authType,
                params: JSON.stringify(
                    formValues
                        .filter(([key]) => key.startsWith(`${authType}.`)) // remove elements that aren't in scope
                        .map(([key, value]) => [key.replace(new RegExp(`^${authType}\.`), ""), value]) // format the relevant keys
                        .reduce((acc, [key, value]) => { // transform onto something ready to be saved
                            if (key === "type") return acc;
                            else if (typeof key !== "string") return acc;
                            return {
                                ...acc,
                                [key]: value,
                            };
                        }, {}),
                ),
            };

            const $formAM = document.querySelector("[data-bind=\"attribute-mapping\"]");
            if (!($formAM instanceof window.HTMLFormElement)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: attribute mapping isn't a form");
            formValues = [...new FormData($formAM)];
            config.middleware.attribute_mapping = {
                related_backend: (formValues.shift() || [])[1],
                params: JSON.stringify(formValues.reduce((acc, [key, value]) => {
                    const k = key.split(".");
                    if (k.length !== 2) return acc;
                    if (!acc[`${k[0]}`]) acc[`${k[0]}`] = {};
                    if (value !== "") acc[`${k[0]}`][`${k[1]}`] = value;
                    return acc;
                }, {})),
            };

            return config;
        }),
    );
}
