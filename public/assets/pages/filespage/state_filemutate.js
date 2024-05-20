import { onDestroy } from "../../lib/skeleton/index.js";
import rxjs from "../../lib/rx.js";

const virtualFiles$ = new rxjs.BehaviorSubject({
    // "/tmp/": [],
    // "/home/": [{ name: "test", type: "directory" }]
});
const mutationFiles$ = new rxjs.BehaviorSubject({
    // "/home/": [{ name: "test", fn: (file) => file, ...]
});

export function touch(path) {
    const [basepath, filename] = extractPath(path);
    stateAdd(virtualFiles$, basepath, {
        name: filename,
        type: "file",
        size: 0,
        time: new Date().getTime(),
        loading: true,
    });
    onDestroy(() => statePop(virtualFiles$, basepath, filename));
    return rxjs.of(null).pipe(
        rxjs.delay(2000),
        removeLoading(basepath, filename),
    );
}

export function mkdir(path) {
    const [basepath, dirname] = extractPath(path);
    stateAdd(virtualFiles$, basepath, {
        name: dirname,
        type: "directory",
        size: 0,
        time: new Date().getTime(),
        loading: true,
    });
    onDestroy(() => {
        statePop(virtualFiles$, basepath, dirname);
        // TODO: update cache
    });
    return rxjs.of(null).pipe(
        rxjs.delay(2000),
        removeLoading(basepath, dirname),
    );
}

export function save(path, size) {
    const [basepath, filename] = extractPath(path);
    stateAdd(virtualFiles$, basepath, {
        name: dirname,
        type: "file",
        size,
        time: new Date().getTime(),
        loading: true,
    });
    onDestroy(() => statePop(virtualFiles$, basepath, filename));
    return rxjs.of(null).pipe(
        rxjs.delay(2000),
        removeLoading(basepath, filename),
    );
}

export function rm(path) {
    const [basepath, filename] = extractPath(path);
    stateAdd(mutationFiles$, basepath, {
        name: filename,
        fn: (file) => {
            if (file.name === filename) file.loading = true;
            return file;
        },
    });
    onDestroy(() => statePop(mutationFiles$, basepath, filename));
    return rxjs.of(null).pipe(
        rxjs.delay(1000),
        rxjs.tap(() => stateAdd(mutationFiles$, basepath, {
            name: filename,
            fn: (file) => file.name === filename ? null : file,
        })),
    );
}

export function mv(fromPath, toPath) {
    // TODO
    return rxjs.of(null).pipe(
        rxjs.delay(1000),
    );
}

export function middlewareLs(path) {
    return rxjs.pipe(
        // case1: virtual files = additional files we want to see displayed in the UI
        rxjs.switchMap(({ files, ...res }) => virtualFiles$.pipe(rxjs.mergeMap((virtualFiles) => {
            const shouldContinue = !!(virtualFiles[path] && virtualFiles[path].length > 0);
            if (!shouldContinue) return rxjs.of({ ...res, files });
            return rxjs.of({
                ...res,
                files: files.concat(virtualFiles[path]),
            });
        }))),
        // case2: file mutation = update a file state, typically to add a loading state to an
        //                        file or remove it entirely
        rxjs.switchMap(({ files, ...res }) => mutationFiles$.pipe(rxjs.mergeMap((fns) => {
            const shouldContinue = !!(fns[path] && fns[path].length > 0);
            if (!shouldContinue) return rxjs.of({ ...res, files });
            for (let i=files.length-1; i>=0; i--) {
                for (let j=0; j<fns[path].length; j++) {
                    files[i] = fns[path][j].fn(files[i]);
                    if (!files[i]) {
                        files.splice(i, 1);
                        break;
                    }
                }
            }
            return rxjs.of({ ...res, files });
        }))),
        rxjs.tap(({ files }) => console.log(files)),
    );
}

function extractPath(path) {
    path = path.replace(new RegExp("/$"), "");
    const p = path.split("/");
    const filename = p.pop();
    return [p.join("/") + "/", filename];
}

function stateAdd(behavior, path, obj) {
    let arr = behavior.value[path];
    if (!arr) arr = [];
    let alreadyKnown = false;
    for (let i=0; i<arr.length; i++) {
        if (arr[i].name === obj.name) {
            alreadyKnown = true;
            arr[i] = obj;
            break;
        }
    }
    if (!alreadyKnown) arr.push(obj);
    behavior.next({
        ...behavior.value,
        [path]: arr,
    });
}

function statePop(behavior, path, filename) {
    const arr = behavior.value[path];
    if (!arr) throw new Error("assertion failed[0] - state_filemutate.js");
    const newArr = arr.filter(({ name }) => name !== filename)
    if (newArr.length === 0) {
        const newState = { ...behavior.value };
        delete newState[path];
        behavior.next(newState);
        return;
    }
    behavior.next({
        ...behavior.value,
        [path]: newArr,
    });
}

function removeLoading(path, filename) {
    return rxjs.tap(() => {
        const arr = virtualFiles$.value[path];
        if (!arr) throw new Error("assertion failed[1]- state_filemutate.js");
        virtualFiles$.next({
            ...virtualFiles$.value,
            [path]: arr.map((file) => {
                if (file.name === filename) delete file.loading;
                return file;
            }),
        });
    });
}
