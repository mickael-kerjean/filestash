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
    if (!perms$.value[path]) return false;
    switch(action) {
    case "new-file": return perms$.value[path]["can_create_file"];
    case "new-folder": return perms$.value[path]["can_create_directory"];
    case "delete": return perms$.value[path]["can_delete"];
    case "rename": return perms$.value[path]["can_rename"];
    default: return false;
    }
}

export function getPermission() {
    return perms$.asObservable();
}
