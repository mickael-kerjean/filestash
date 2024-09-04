import { onDestroy } from "../../lib/skeleton/index.js";
import rxjs from "../../lib/rx.js";
import fscache from "./cache.js";
import { hooks } from "./model_files.js";
import { extractPath, isDir, currentPath } from "./helper.js";

/*
 * The virtual files is used to rerender the list of files in a particular location. That's used
 * when we want to update the dom when doing either of a touch, mkdir, rm, mv, ...
 *
 *   |---------------|      |---------------|
 *   |      LS       | ---> | Virtual Layer | ---> Observable
 *   |---------------|      |---------------|
 *
 * It is split onto 2 parts:
 * - the virtualFiles$: which are things we want to display in addition to what is currently
 *   visible on the screen
 * - the mutationFiles$: which are things already on the screen which we need to mutate. For
 *   example when we want a particular file to show a loading spinner, ...
 */

const virtualFiles$ = new rxjs.BehaviorSubject({
    // "/tmp/": [],
    // "/home/": [{ name: "test", type: "directory" }]
});
const mutationFiles$ = new rxjs.BehaviorSubject({
    // "/home/": [{ name: "test", fn: (file) => file, ...]
});

class IVirtualLayer {
    before() { throw new Error("NOT_IMPLEMENTED"); }
    async afterSuccess() { throw new Error("NOT_IMPLEMENTED"); }
    async afterError() { return rxjs.EMPTY; }
}

export function withVirtualLayer(ajax$, mutate) {
    mutate.before();
    return ajax$.pipe(
        rxjs.tap((resp) => mutate.afterSuccess(resp)),
        rxjs.catchError(mutate.afterError),
    );
};

export function touch(path) {
    const [basepath, filename] = extractPath(path);
    const file = {
        name: filename,
        type: "file",
        size: 0,
        time: new Date().getTime(),
    };

    return new class TouchVL extends IVirtualLayer {
        /**
         * @override
         */
        before() {
            stateAdd(virtualFiles$, basepath, {
                ...file,
                loading: true,
            });
        }

        /**
         * @override
         */
        async afterSuccess() {
            removeLoading(virtualFiles$, basepath, filename);
            onDestroy(() => statePop(virtualFiles$, basepath, filename));
            await fscache().update(basepath, ({ files = [], ...rest }) => ({
                files: files.concat([file]),
                ...rest,
            }));
            hooks.mutation.emit({ op: "touch", path: basepath });
        }

        /**
         * @override
         */
        async afterError() {
            statePop(virtualFiles$, basepath, filename);
            return rxjs.of(fscache().remove(basepath)).pipe(
                rxjs.mergeMap(() => rxjs.EMPTY),
            );
        }
    }();
}

export function mkdir(path) {
    const [basepath, dirname] = extractPath(path);
    const file = {
        name: dirname,
        type: "directory",
        size: 0,
        time: new Date().getTime(),
    };

    return new class MkdirVL extends IVirtualLayer {
        /**
         * @override
         */
        before() {
            stateAdd(virtualFiles$, basepath, {
                ...file,
                loading: true,
            });
            statePop(mutationFiles$, basepath, dirname); // case: rm followed by mkdir
        }

        /**
         * @override
         */
        async afterSuccess() {
            removeLoading(virtualFiles$, basepath, dirname);
            onDestroy(() => statePop(virtualFiles$, basepath, dirname));
            await fscache().update(basepath, ({ files = [], ...rest }) => ({
                files: files.concat([file]),
                ...rest,
            }));
            hooks.mutation.emit({ op: "mkdir", path: basepath });
        }

        /**
         * @override
         */
        async afterError() {
            statePop(virtualFiles$, basepath, dirname);
            return rxjs.of(fscache().remove(basepath)).pipe(
                rxjs.mergeMap(() => rxjs.EMPTY),
            );
        }
    }();
}

export function save(path, size) {
    const [basepath, filename] = extractPath(path);
    const file = {
        name: filename,
        type: "file",
        size,
        time: new Date().getTime(),
    };

    return new class SaveVL extends IVirtualLayer {
        /**
         * @override
         */
        before() {
            stateAdd(virtualFiles$, basepath, {
                ...file,
                loading: true,
            });
            statePop(mutationFiles$, basepath, filename); // eg: rm followed by save
        }

        /**
         * @override
         */
        async afterSuccess() {
            if (basepath === currentPath()) removeLoading(virtualFiles$, basepath, filename);
            else onDestroy(() => removeLoading(virtualFiles$, basepath, filename));
            onDestroy(() => statePop(virtualFiles$, basepath, filename));
            await fscache().update(basepath, ({ files = [], ...rest }) => ({
                files: files.concat([file]),
                ...rest,
            }));
            hooks.mutation.emit({ op: "save", path: basepath });
        }

        /**
         * @override
         */
        async afterError() {
            statePop(virtualFiles$, basepath, filename);
            return rxjs.EMPTY;
        }
    }();
}

export function rm(...paths) {
    if (paths.length === 0) return rxjs.of(null);
    const arr = new Array(paths.length * 2);
    let basepath = null;
    for (let i=0; i<paths.length; i++) {
        [arr[2*i], arr[2*i+1]] = extractPath(paths[i]);
        if (i === 0) basepath = arr[2*i];
        else if (basepath !== arr[2*i]) throw new Error("NOT_IMPLEMENTED");
    }

    return new class RmVL extends IVirtualLayer {
        /**
         * @override
         */
        before() {
            for (let i=0; i<arr.length; i+=2) {
                stateAdd(mutationFiles$, arr[i], {
                    name: arr[i+1],
                    fn: (file) => {
                        if (file.name === arr[i+1]) {
                            file.loading = true;
                            file.last = true;
                        }
                        return file;
                    },
                });
                statePop(virtualFiles$, arr[i], arr[i+1]); // eg: touch followed by rm
            }
        }

        /**
         * @override
         */
        async afterSuccess() {
            for (let i=0; i<arr.length; i+=2) {
                stateAdd(mutationFiles$, arr[i], {
                    name: arr[i+1],
                    fn: (file) => {
                        for (let i=0; i<arr.length; i+=2) {
                            if (file.name === arr[i+1]) return null;
                        }
                        return file;
                    },
                });
            }
            onDestroy(() => {
                for (let i=0; i<arr.length; i+=2) {
                    statePop(mutationFiles$, arr[i], arr[i+1]);
                }
            });
            await Promise.all(paths.map((path) => fscache().remove(path, false)));
            await fscache().update(basepath, ({ files = [], ...rest }) => ({
                files: files.filter(({ name }) => {
                    for (let i=0; i<arr.length; i+=2) {
                        if (name === arr[i+1]) {
                            return false;
                        }
                    }
                    return true;
                }),
                ...rest,
            }));
            if (arr.length > 0) hooks.mutation.emit({ op: "rm", path: arr[0] });
        }

        /**
         * @override
         */
        async afterError() {
            for (let i=0; i<arr.length; i+=2) {
                stateAdd(mutationFiles$, arr[i], {
                    name: arr[i+1],
                    fn: (file) => {
                        if (file.name === arr[i+1]) {
                            delete file.loading;
                            delete file.last;
                        }
                        return file;
                    },
                });
            }
            return rxjs.EMPTY;
        }
    }();
}

export function mv(fromPath, toPath) {
    const [fromBasepath, fromName] = extractPath(fromPath);
    const [toBasepath, toName] = extractPath(toPath);
    let type = null;

    return new class MvVL extends IVirtualLayer {
        /**
         * @override
         */
        before() {
            if (fromBasepath === toBasepath) this._beforeSamePath();
            else this._beforeSamePath();
        }

        _beforeSamePath() {
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
        }

        _beforeDifferentPath() {
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

        /**
         * @override
         */
        async afterSuccess() {
            fscache().remove(fromPath, false);
            if (fromBasepath === toBasepath) await this._afterSuccessSamePath();
            else await this._afterSuccessDifferentPath();
        }

        async _afterSuccessSamePath() {
            stateAdd(mutationFiles$, fromBasepath, {
                name: fromName,
                fn: (file) => {
                    if (file.name === toName) delete file.loading;
                    return file;
                },
            });
            await fscache().update(fromBasepath, ({ files = [], ...rest }) => {
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
            hooks.mutation.emit({ op: "mv", path: fromBasepath });
        }

        async _afterSuccessDifferentPath() {
            stateAdd(mutationFiles$, fromBasepath, {
                name: fromName,
                fn: (file) => {
                    if (file.name === fromName) return null;
                    return file;
                },
            });
            onDestroy(() => statePop(mutationFiles$, fromBasepath, fromName));
            statePop(virtualFiles$, toBasepath, toName);
            await fscache().update(fromBasepath, ({ files = [], ...rest }) => ({
                files: files.filter((file) => file.name !== fromName),
                ...rest,
            }));
            await fscache().update(toBasepath, ({ files = [], ...rest }) => ({
                files: files.concat([{
                    name: fromName,
                    time: new Date().getTime(),
                    type,
                }]),
                ...rest,
            }));
            if (isDir(fromPath)) await fscache().remove(fromPath);
            hooks.mutation.emit({ op: "mv", path: fromBasepath });
            hooks.mutation.emit({ op: "mv", path: toBasepath });
        }

        /**
         * @override
         */
        async afterError() {
            statePop(mutationFiles$, fromBasepath, fromName);
            if (fromBasepath !== toBasepath) {
                statePop(virtualFiles$, toBasepath, toName);
            }
            return rxjs.EMPTY;
        }
    }();
}

export function ls(path) {
    return rxjs.pipe(
        // case1: file mutation = update a file state, typically to add a loading state to an
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
        // case2: virtual files = additional files we want to see displayed in the UI
        rxjs.switchMap(({ files, ...res }) => virtualFiles$.pipe(rxjs.mergeMap((virtualFiles) => {
            const shouldContinue = !!(virtualFiles[path] && virtualFiles[path].length > 0);
            if (!shouldContinue) return rxjs.of({ ...res, files });
            return rxjs.of({
                ...res,
                files: files.concat(virtualFiles[path]),
            });
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
    const newArr = arr.filter(({ name }) => name !== filename);
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
