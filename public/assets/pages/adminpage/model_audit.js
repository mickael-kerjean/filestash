import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

const isLoading$ = new rxjs.BehaviorSubject(false);

export function get(searchParams = new URLSearchParams()) {
    return ajax({
        url: "/admin/api/audit?" + searchParams.toString(),
        responseType: "json"
    }).pipe(
        rxjs.map(({ responseJSON }) => responseJSON.result)
    );
}

export function setLoader(value) {
    return isLoading$.next(!!value);
}

export function isLoading() {
    return isLoading$.asObservable();
}
