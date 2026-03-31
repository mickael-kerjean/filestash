import rxjs from "../../lib/rx.js";

const perms$ = new rxjs.BehaviorSubject({});

export function setPermissions(path, value = {}) {
    if (JSON.stringify(value) === JSON.stringify(perms$.value[path])) return;
    perms$.next({
        ...perms$.value,
        [path]: value,
    });
}

export function calculatePermission(path, action) {
    const toBool = (n) => n === undefined ? true : n;
    if (!perms$.value[path]) return false;
    switch (action) {
    case "new-file": return toBool(perms$.value[path]["can_create_file"]);
    case "new-folder": return toBool(perms$.value[path]["can_create_directory"]);
    case "delete": return toBool(perms$.value[path]["can_delete"]);
    case "rename": return toBool(perms$.value[path]["can_move"]);
    case "upload": return toBool(perms$.value[path]["can_upload"]);
    default: return false;
    }
}

export function getPermission(path) {
    return perms$.asObservable().pipe(
        rxjs.map((perms) => perms[path]),
    );
}
