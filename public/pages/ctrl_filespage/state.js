import rxjs from "../../lib/rx.js";

const state$ = new rxjs.ReplaySubject();
const files$ = new rxjs.BehaviorSubject([]);

export const getState$ = () => state$.asObservable();
export const getFiles$ = () => files$.asObservable();

export const reset = () => {
    state$.next({
        search: null,
        sort: null,
        view: null,
        acl: {},
        loading: true,
        path: "/test/",
    });
};
reset();

export const onNavigate = () => {
    console.log("NAVIGATION ATTEMPT");
};

export const onNewFile = () => {
    console.log("CLICK NEW FILE");
};

export const onNewDirectory = () => {
    console.log("CLICK NEW DIRECTORY");
};

export const onSelectFileOrFolder = () => {
    console.log("SELECT FILE / FOLDER");
};

export const onSearch = () => {
    console.log("SEARCH")
};
