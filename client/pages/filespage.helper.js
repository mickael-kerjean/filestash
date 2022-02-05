import { Files } from "../model/";
import { notify, upload } from "../helpers/";
import Path from "path";
import { Observable } from "rxjs/Observable";
import { t } from "../locales/";

export const sort = function(files, type) {
    if (type === "name") {
        return sortByName(files);
    } else if (type === "date") {
        return sortByDate(files);
    } else {
        return sortByType(files);
    }
    function _moveLoadingDownward(fileA, fileB) {
        if (fileA.icon === "loading" && fileB.icon !== "loading") {
            return +1;
        } else if (fileA.icon !== "loading" && fileB.icon === "loading") {
            return -1;
        }
        return 0;
    };
    function _moveFolderUpward(fileA, fileB) {
        if (["directory", "link"].indexOf(fileA.type) === -1 &&
            ["directory", "link"].indexOf(fileB.type) !== -1) {
            return +1;
        } else if (["directory", "link"].indexOf(fileA.type) !== -1 &&
                   ["directory", "link"].indexOf(fileB.type) === -1) {
            return -1;
        }
        return 0;
    };
    function _moveHiddenFilesDownward(fileA, fileB) {
        if (fileA.name[0] === "." && fileB.name[0] !== ".") return +1;
        else if (fileA.name[0] !== "." && fileB.name[0] === ".") return -1;
        return 0;
    };
    function sortByType(files) {
        return files.sort((fileA, fileB) => {
            let tmp = _moveLoadingDownward(fileA, fileB);
            if (tmp !== 0) return tmp;

            tmp = _moveFolderUpward(fileA, fileB);
            if (tmp !== 0) return tmp;

            tmp = _moveHiddenFilesDownward(fileA, fileB);
            if (tmp !== 0) return tmp;

            const aExt = Path.extname(fileA.name.toLowerCase());
            const bExt = Path.extname(fileB.name.toLowerCase());

            if (fileA.name.toLowerCase() === fileB.name.toLowerCase()) {
                return fileA.name > fileB.name ? +1 : -1;
            } else {
                if (aExt !== bExt) return aExt > bExt ? +1 : -1;
                else return fileA.name.toLowerCase() > fileB.name.toLowerCase() ? +1 : -1;
            }
        });
    }
    function sortByName(files) {
        return files.sort((fileA, fileB) => {
            let tmp = _moveLoadingDownward(fileA, fileB);
            if (tmp !== 0) return tmp;

            tmp = _moveFolderUpward(fileA, fileB);
            if (tmp !== 0) return tmp;

            tmp = _moveHiddenFilesDownward(fileA, fileB);
            if (tmp !== 0) return tmp;

            if (fileA.name.toLowerCase() === fileB.name.toLowerCase()) {
                return fileA.name > fileB.name ? +1 : -1;
            }
            return fileA.name.toLowerCase() > fileB.name.toLowerCase() ? +1 : -1;
        });
    }
    function sortByDate(files) {
        return files.sort((fileA, fileB) => {
            const tmp = _moveLoadingDownward(fileA, fileB);
            if (tmp !== 0) return tmp;

            if (fileB.time === fileA.time) {
                return fileA.name > fileB.name ? +1 : -1;
            }
            return fileB.time - fileA.time;
        });
    }
};

export const onCreate = function(path, type, file) {
    if (type === "file") {
        return Files.touch(path, file)
            .then(() => {
                notify.send(
                    t("A file named '{{VALUE}}' was created", Path.basename(path)),
                    "success",
                );
                return Promise.resolve();
            })
            .catch((err) => {
                notify.send(err, "error");
                return Promise.reject(err);
            });
    } else if (type === "directory") {
        return Files.mkdir(path)
            .then(() => notify.send(
                t("A folder named '{{VALUE}}' was created", Path.basename(path)),
                "success",
            ))
            .catch((err) => notify.send(err, "error"));
    } else {
        return Promise.reject({
            message: t("internal error: can't create a {{VALUE}}", type.toString()),
            code: "UNKNOWN_TYPE",
        });
    }
};

export const onRename = function(from, to, type) {
    return Files.mv(from, to, type)
        .then(() => notify.send(
            t("The file '{{VALUE}}' was renamed", Path.basename(from)),
            "success",
        ))
        .catch((err) => notify.send(err, "error"));
};

export const onDelete = function(path, type) {
    return Files.rm(path, type)
        .then(() => notify.send(
            t("The file {{VALUE}} was deleted", Path.basename(path)),
            "success",
        ))
        .catch((err) => notify.send(err, "error"));
};

export const onMultiDelete = function(arrOfPath) {
    return Promise.all(arrOfPath.map((p) => Files.rm(p)))
        .then(() => notify.send(t("All done!"), "success"))
        .catch((err) => notify.send(err, "error"));
};

export const onDownload = function(path, filename) {
    return Files.url(path).then(
        url => {const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);}
    ).catch((err) => notify.send(err, "error"));
};

export const onMultiDownload = function(arr) {
    return Files.zip(arr)
        .catch((err) => notify.send(err, "error"));
};

export const onMultiRename = function(arrOfPath) {
    return Promise.all(arrOfPath.map((p) => Files.mv(p[0], p[1])))
        .then(() => notify.send(t("All done!"), "success"))
        .catch((err) => notify.send(err, "error"));
};

/*
 * The upload method has a few strategies:
 * 1. user is coming from drag and drop + browser provides support to read entire folders
 * 2. user is coming from drag and drop + browser DOES NOT provides support to read entire folders
 * 3. user is coming from a upload form button as he doesn't have drag and drop with files
 */
export const onUpload = function(path, e) {
    let extractFiles = null;
    if (e.dataTransfer === undefined) { // case 3
        extractFiles = extract_upload_crappy_hack_but_official_way(e.target);
    } else {
        if (e.dataTransfer.types && e.dataTransfer.types.length >= 0) {
            if (e.dataTransfer.types[0] === "text/uri-list") {
                return;
            }
        }
        extractFiles = extract_upload_directory_the_way_that_works_but_non_official(
            e.dataTransfer.items || [], [],
        ) // case 1
            .then((files) => {
                if (files.length === 0) { // case 2
                    return extract_upload_crappy_hack_but_official_way(e.dataTransfer);
                }
                return Promise.resolve(files);
            });
    }

    extractFiles.then((files) => upload.add(path, files));

    // adapted from: https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    function _rand_id() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + s4() + s4();
    }

    function extract_upload_directory_the_way_that_works_but_non_official(items, files = []) {
        const traverseDirectory = (item, _files, parent_id) => {
            const file = {
                path: item.fullPath,
            };
            if (item.isFile) {
                return new Promise((done, err) => {
                    file.type = "file";
                    item.file((_file, _err) => {
                        if (!_err) {
                            file.file = _file;
                            if (parent_id) file._prior = parent_id;
                            _files.push(file);
                        }
                        done(_files);
                    });
                });
            } else if (item.isDirectory) {
                file.type = "directory";
                file.path += "/";
                file._id = _rand_id();
                if (parent_id) file._prior = parent_id;
                _files.push(file);

                const reader = item.createReader();
                const filereader = function(r) {
                    return new Promise((done) => {
                        r.readEntries(function(entries) {
                            Promise.all(entries.map((entry) => {
                                return traverseDirectory(entry, _files, file._id);
                            })).then((e) => {
                                if (entries.length > 0) {
                                    return filereader(r).then(done);
                                }
                                return done(e);
                            });
                        });
                    });
                };
                return filereader(reader).then(() => {
                    return Promise.resolve(_files);
                });
            } else {
                return Promise.resolve();
            }
        };
        return Promise.all(
            Array.prototype.slice.call(items).map((item) => {
                if (typeof item.webkitGetAsEntry === "function") {
                    return traverseDirectory(item.webkitGetAsEntry(), files.slice(0));
                }
            }).filter((e) => e),
        ).then((res) => Promise.resolve([].concat.apply([], res)));
    }

    function extract_upload_crappy_hack_but_official_way(data) {
        const _files = data.files;
        return Promise.all(
            Array.prototype.slice.call(_files).map((_file) => {
                return detectType(_file)
                    .then(transform);
                function detectType(_f) {
                    // the 4096 is an heuristic I've observed and taken from:
                    // https://stackoverflow.com/questions/25016442
                    // however the proposed answer is just wrong as it doesn't consider folder with
                    // name such as: test.png and as Stackoverflow favor consanguinity with their
                    // point system, I couldn't rectify the proposed answer. The following code is
                    // actually working as expected
                    if (_file.size % 4096 !== 0) {
                        return Promise.resolve("file");
                    }
                    return new Promise((done, err) => {
                        const reader = new window.FileReader();
                        reader.onload = function() {
                            done("file");
                        };
                        reader.onerror = function() {
                            done("directory");
                        };
                        reader.readAsText(_f);
                    });
                }

                function transform(_type) {
                    const file = {
                        type: _type,
                        path: _file.name,
                    };
                    if (file.type === "file") {
                        file.file = _file;
                    } else {
                        file.path += "/";
                    }
                    return Promise.resolve(file);
                }
            }),
        );
    }
};


export const onSearch = (keyword, path = "/") => {
    return new Observable((obs) => {
        Files.search(keyword, path)
            .then((f) => obs.next(f))
            .catch((err) => obs.error(err));
    });
};
