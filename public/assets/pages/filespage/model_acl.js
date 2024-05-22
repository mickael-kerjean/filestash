import rxjs from "../../lib/rx.js";

const perms$ = new rxjs.BehaviorSubject({});

export function setPermissions(value = {}) {
    if (JSON.stringify(value) === JSON.stringify(perms$.value)) return;
    perms$.next(value);
}

export function calculatePermission(action) {
    switch(action) {
    case "new-file": return perms$.value["can_create_file"];
    case "new-folder": return perms$.value["can_create_directory"];
    case "delete": return perms$.value["can_delete"];
    case "rename": return perms$.value["can_rename"];
    default: return false;
    }
}

export function getPermission() {
    return perms$.asObservable();
}
