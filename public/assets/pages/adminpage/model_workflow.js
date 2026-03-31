import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

export function workflowAll() {
    return ajax({
        url: "admin/api/workflow",
        responseType: "json",
    }).pipe(
        rxjs.map(({ responseJSON }) => responseJSON.result),
        rxjs.map(({ workflows, triggers, actions }) => ({
            workflows,
            triggers,
            actions,
        })),
    );
}

export function workflowUpsert(body) {
    return ajax({
        url: "admin/api/workflow",
        responseType: "json",
        method: "POST",
        body,
    }).pipe(
        rxjs.map(({ responseJSON }) => responseJSON.result)
    );
}

export function workflowDelete(id) {
    return ajax({
        url: "admin/api/workflow?id=" + id,
        responseType: "json",
        method: "DELETE",
    }).pipe(
        rxjs.map(({ responseJSON }) => responseJSON.result)
    );
}

export function workflowGet(id) {
    return ajax({
        url: "admin/api/workflow/" + id,
        responseType: "json",
    }).pipe(
        rxjs.map(({ responseJSON }) => responseJSON.result)
    );
}
