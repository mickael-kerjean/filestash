import rxjs from "../../lib/rx.js";

const state$ = new rxjs.BehaviorSubject({
    search: null,
    sort: null,
    view: null,
    acl: {},
    path: "/",
    mutation: {},
    error: null
});

export const getState$ = () => state$.asObservable();

export const onNewFile = () => {
    console.log("CLICK NEW FILE");
};

export const handleError = () => {
    return rxjs.catchError((err) => {
        if (err) {
            state$.next({
                ...state$.value,
                error: err
            });
        }
        return rxjs.empty();
    });
};

export const onNewDirectory = () => {
    console.log("CLICK NEW DIRECTORY");
};

export const onSearch = () => {
    console.log("SEARCH");
};

export const getFiles = (n) => {};
