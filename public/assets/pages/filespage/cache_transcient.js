import { onDestroy } from "../../lib/skeleton/index.js";
import rxjs from "../../lib/rx.js";
import fscache from "./cache.js";
import { extractPath, isDir } from "./helper.js";

/*
 * The transcient cache is used to rerender the list of files in a particular location. That's used
 * when the user is doing either of a touch, mkdir, rm or mv. It is split onto 2 parts:
 * - the virtualFiles$: which are things we want to display in addition to what is currently
 *   visible on the screen
 * - the mutationFiles$: which are things already on the screen which we need to mutate. For
 *   example when we want a particular file to show a loading spinner
 */

const virtualFiles$ = new rxjs.BehaviorSubject({
    // "/tmp/": [],
    // "/home/": [{ name: "test", type: "directory" }]
});
const mutationFiles$ = new rxjs.BehaviorSubject({
    // "/home/": [{ name: "test", fn: (file) => file, ...]
});

export function touch(ajax$, path) {
    const [basepath, filename] = extractPath(path);
    const file = {
        name: filename,
        type: "file",
        size: 0,
        time: new Date().getTime(),
    };
    stateAdd(virtualFiles$, basepath, {
        ...file,
        loading: true,
    });
    const onSuccess = async () => {
        removeLoading(virtualFiles$, basepath, filename);
        onDestroy(() => statePop(virtualFiles$, basepath, filename));
        await fscache().update(basepath, ({ files, ...rest }) => ({
            files: files.concat([file]),
            ...rest,
        }));
    };
    const onFailure = (err, caught) => {
        statePop(virtualFiles$, basepath, filename);
        return rxjs.of(fscache().remove(basepath)).pipe(
            rxjs.mergeMap(() => rxjs.EMPTY),
        );
    };
    return ajax$.pipe(
        rxjs.mergeMap(onSuccess),
        rxjs.catchError(onFailure),
    );
}

export function mkdir(ajax$, path) {
    const [basepath, dirname] = extractPath(path);
    const file = {
        name: dirname,
        type: "directory",
        size: 0,
        time: new Date().getTime(),
    };
    stateAdd(virtualFiles$, basepath, {
        ...file,
        loading: true,
    });
    const onSuccess = async () => {
        removeLoading(virtualFiles$, basepath, dirname);
        onDestroy(() => statePop(virtualFiles$, basepath, dirname));
        await fscache().update(basepath, ({ files, ...rest }) => ({
            files: files.concat([file]),
            ...rest,
        }));
    };
    const onFailure = () => {
        statePop(virtualFiles$, basepath, dirname);
        return rxjs.of(fscache().remove(basepath)).pipe(
            rxjs.mergeMap(() => rxjs.EMPTY),
        );
    };
    return ajax$.pipe(
        rxjs.mergeMap(onSuccess),
        rxjs.catchError(onFailure),
    );
}

export function save(ajax$, path, size) {
    const [basepath, filename] = extractPath(path);
    const file = {
        name: dirname,
        type: "file",
        size,
        time: new Date().getTime(),
    };
    stateAdd(virtualFiles$, basepath, {
        ...file,
        loading: true,
    });
    const onSuccess = async () => {
        removeLoading(virtualFiles$, basepath, filename);
        onDestroy(() => statePop(virtualFiles$, basepath, filename));
        await fscache().update(basepath, ({ files, ...rest }) => ({
            files: files.concat([file]),
            ...rest,
        }));
    };
    const onFailure = () => {
        statePop(virtualFiles$, basepath, dirname);
        return rxjs.EMPTY;
    };
    return ajax$.pipe(
        rxjs.tap(onSuccess),
        rxjs.catchError(onFailure),
    );
}

export function rm(ajax$, ...paths) {
    if (paths.length === 0) return rxjs.of(null);
    const arr = new Array(paths.length * 2);
    let basepath = null;
    for (let i=0;i<paths.length;i++) {
        [arr[2*i], arr[2*i+1]] = extractPath(paths[i]);
        if (i === 0) basepath = arr[2*i];
        else if (basepath !== arr[2*i]) throw new Error("NOT_IMPLEMENTED");
    }
    stateAdd(mutationFiles$, basepath, {
        name: basepath,
        fn: (file) => {
            for (let i=0;i<arr.length;i+=2) {
                if (file.name === arr[i+1]) {
                    file.loading = true;
                    file.last = true;
                }
            }
            return file;
        },
    });
    const onSuccess = async () => {
        stateAdd(mutationFiles$, basepath, {
            name: basepath,
            fn: (file) => {
                for (let i=0;i<arr.length;i+=2) {
                    if (file.name === arr[i+1]) return null;
                }
                return file;
            },
        });
        onDestroy(() => statePop(mutationFiles$, basepath, basepath));
        await Promise.all(paths.map((path) => fscache().remove(path, false)));
        await fscache().update(basepath, ({ files, ...rest }) => ({
            files: files.filter(({ name }) => {
                for (let i=0;i<arr.length;i+=2) {
                    if (name === arr[i+1]) {
                        return false;
                    }
                }
                return true;
            }),
            ...rest,
        }));
    };
    const onFailure = () => {
        stateAdd(mutationFiles$, basepath, {
            name: basepath,
            fn: (file) => {
                for (let i=0;i<arr.length;i+=2) {
                    if (file.name === arr[i+1]) {
                        delete file.loading;
                        delete file.last;
                    }
                }
                return file;
            },
        });
        return rxjs.EMPTY;
    };
    return ajax$.pipe(
        rxjs.tap(onSuccess),
        rxjs.catchError(onFailure),
    );
}

export function mv(ajax$, fromPath, toPath) {
    const [fromBasepath, fromName] = extractPath(fromPath);
    const [toBasepath, toName] = extractPath(toPath);
    let type = null;
    if (fromBasepath === toBasepath) {
        stateAdd(mutationFiles$, fromBasepath, {
            name: fromName,
            fn: (file) => {
                if (file.name === fromName) {
                    file.loading = true;
                    file.name = toName;
                    type = file.type;
                }
                return file;
            },
        });
    } else {
        stateAdd(mutationFiles$, fromBasepath, {
            name: fromName,
            fn: (file) => {
                if (file.name === fromName) {
                    file.loading = true;
                    file.last = true;
                    type = file.type;
                }
                return file;
            },
        });
        stateAdd(virtualFiles$, toBasepath, {
            name: toName,
            loading: true,
            type,
        });
    }
    const onSuccess = async () => {
        fscache().remove(fromPath, false);
        if (fromBasepath === toBasepath) {
            stateAdd(mutationFiles$, fromBasepath, {
                name: fromName,
                fn: (file) => {
                    if (file.name === toName) delete file.loading;
                    return file;
                },
            });
            await fscache().update(fromBasepath, ({ files, ...rest }) => {
                return {
                    files: files.map((file) => {
                        if (file.name === fromName) {
                            file.name = toName;
                        }
                        return file;
                    }),
                    ...rest,
                };
            });
        } else {
            stateAdd(mutationFiles$, fromBasepath, {
                name: fromName,
                fn: (file) => {
                    if (file.name === fromName) return null;
                    return file;
                },
            });
            onDestroy(() => statePop(mutationFiles$, fromBasepath, fromName));
            statePop(virtualFiles$, toBasepath, toName);
            await fscache().update(fromBasepath, ({ files, ...rest }) => ({
                files: files.filter((file) => file.name === fromName ? false : true),
                ...rest,
            }))
            await fscache().update(toBasepath, ({ files, ...rest }) => ({
                files: files.concat([{
                    name: fromName,
                    time: new Date().getTime(),
                    type,
                }]),
                ...rest,
            }));
            if (isDir(fromPath)) await fscache.remove(fromPath);
        }
    };
    const onFailure = () => {
        statePop(mutationFiles$, fromBasepath, fromName);
        if (fromBasepath !== toBasepath) {
            statePop(virtualFiles$, toBasepath, toName);
        }
        return rxjs.EMPTY;
    };
    return ajax$.pipe(
        rxjs.tap(onSuccess),
        rxjs.catchError(onFailure),
    );
}

export function ls(path) {
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
    );
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
    if (!arr) return;
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

function removeLoading(behavior, path, filename) {
    const arr = behavior.value[path];
    if (!arr) return;
    virtualFiles$.next({
        ...virtualFiles$.value,
        [path]: arr.map((file) => {
            if (file.name === filename) delete file.loading;
            return file;
        }),
    });
}
