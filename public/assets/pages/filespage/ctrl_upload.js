import { createElement, createFragment, createRender } from "../../lib/skeleton/index.js";
import rxjs, { effect, onClick } from "../../lib/rx.js";
import { forwardURLParams } from "../../lib/path.js";
import { animate, slideYOut } from "../../lib/animate.js";
import { loadCSS } from "../../helpers/loader.js";
import { qs } from "../../lib/dom.js";
import { AjaxError } from "../../lib/error.js";
import assert from "../../lib/assert.js";
import { currentPath, isNativeFileUpload } from "./helper.js";
import { getPermission, calculatePermission } from "./model_acl.js";
import { mkdir, save } from "./model_virtual_layer.js";
import t from "../../locales/index.js";

const workers$ = new rxjs.BehaviorSubject({ tasks: [], size: null });
const ABORT_ERROR = new AjaxError("aborted", null, "ABORTED");

export default async function(render) {
    if (!document.querySelector(`[is="component_upload_queue"]`)) {
        const $queue = createElement(`<div is="component_upload_queue"></div>`);
        document.body.appendChild($queue);
        componentUploadQueue(createRender($queue), { workers$ });
    }

    effect(getPermission().pipe(
        rxjs.filter(() => calculatePermission(currentPath(), "new-file")),
        rxjs.tap(() => {
            const $page = createFragment(`
                <div is="component_filezone"></div>
                <div is="component_upload_fab"></div>
            `);
            componentFilezone(createRender(assert.type($page.children[0], HTMLElement)), { workers$ });
            componentUploadFAB(createRender(assert.type($page.children[1], HTMLElement)), { workers$ });
            render($page);
        }),
    ));
}

export function init() {
    return loadCSS(import.meta.url, "./ctrl_upload.css");
}

function componentUploadFAB(render, { workers$ }) {
    const $page = createElement(`
        <div class="component_mobilefileupload no-select">
            <form>
                <input type="file" name="file" id="mobilefileupload" multiple />
                <label for="mobilefileupload" title="${t("Upload")}">
                    <img
                        class="component_icon"
                        draggable="false"
                        alt="upload"
                        src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMzg0IDUxMiI+CiAgPHBhdGggZmlsbD0iI2YyZjJmMiIgZD0iTSAzNjAsNDYwIEggMjQgQyAxMC43LDQ2MCAwLDQ1My4zIDAsNDQwIHYgLTEyIGMgMCwtMTMuMyAxMC43LC0yMCAyNCwtMjAgaCAzMzYgYyAxMy4zLDAgMjQsNi43IDI0LDIwIHYgMTIgYyAwLDEzLjMgLTEwLjcsMjAgLTI0LDIwIHoiIC8+CiAgPHBhdGggZmlsbD0iI2YyZjJmMiIgZD0ibSAyMjYuNTUzOSwxNDkuMDAzMDMgdiAxNjEuOTQxIGMgMCw2LjYyNyAtNS4zNzMsMTIgLTEyLDEyIGggLTQ0IGMgLTYuNjI3LDAgLTEyLC01LjM3MyAtMTIsLTEyIHYgLTE2MS45NDEgaCAtNTIuMDU5IGMgLTIxLjM4MiwwIC0zMi4wOSwtMjUuODUxIC0xNi45NzEsLTQwLjk3MSBsIDg2LjA1OSwtODYuMDU4OTk3IGMgOS4zNzMsLTkuMzczIDI0LjU2OSwtOS4zNzMgMzMuOTQxLDAgbCA4Ni4wNTksODYuMDU4OTk3IGMgMTUuMTE5LDE1LjExOSA0LjQxMSw0MC45NzEgLTE2Ljk3MSw0MC45NzEgeiIgLz4KPC9zdmc+Cg=="
                    />
                </label>
            </form>
        </div>
    `);
    effect(rxjs.fromEvent(qs($page, `input[type="file"]`), "change").pipe(
        rxjs.tap(async(e) => workers$.next(await processFiles(e.target.files))),
    ));
    render($page);
}

function componentFilezone(render, { workers$ }) {
    const selector = `[data-bind="filemanager-children"]`;
    const $target = assert.type(qs(document.body, selector), HTMLElement);

    $target.ondragenter = (e) => {
        if (!isNativeFileUpload(e)) return;
        $target.classList.add("dropzone");
    };
    $target.ondrop = async(e) => {
        if (!isNativeFileUpload(e)) return;
        $target.classList.remove("dropzone");
        e.preventDefault();
        const loadID = setTimeout(() => render(createElement("<div>LOADING</div>")), 2000);
        if (e.dataTransfer.items instanceof window.DataTransferItemList) {
            workers$.next(await processItems(e.dataTransfer.items));
        } else if (e.dataTransfer.files instanceof window.FileList) {
            workers$.next(await processFiles(e.dataTransfer.files));
        } else {
            assert.fail("NOT_IMPLEMENTED - unknown entry type in ctrl_upload.js");
        }
        clearTimeout(loadID);
        render(createFragment(""));
    };
    $target.ondragleave = (e) => {
        if (!isNativeFileUpload(e)) return;
        if (!(e.relatedTarget === null || // eg: drag outside the window
              !e.relatedTarget.closest(selector) // eg: drag on the breadcrumb, ...
        )) return;
        $target.classList.remove("dropzone");
    };
    $target.ondragover = (e) => e.preventDefault();
}

const MAX_WORKERS = 4;

function componentUploadQueue(render, { workers$ }) {
    const $page = createElement(`
        <div class="component_upload hidden">
            <h2 class="no-select">${t("Current Upload")}
                <div class="count_block">
                    <span class="completed">0</span>
                    <span class="grandTotal">0</span>
                </div>
                <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MS45NzYgNTEuOTc2Ij4KICA8cGF0aCBzdHlsZT0iZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eTowLjUzMzMzMjg1O3N0cm9rZS13aWR0aDoxLjQ1NjgxMTE5IiBkPSJtIDQxLjAwNTMxLDQwLjg0NDA2MiBjIC0xLjEzNzc2OCwxLjEzNzc2NSAtMi45ODIwODgsMS4xMzc3NjUgLTQuMTE5ODYxLDAgTCAyNi4wNjg2MjgsMzAuMDI3MjM0IDE0LjczNzU1MSw0MS4zNTgzMSBjIC0xLjEzNzc3MSwxLjEzNzc3MSAtMi45ODIwOTMsMS4xMzc3NzEgLTQuMTE5ODYxLDAgLTEuMTM3NzcyMiwtMS4xMzc3NjggLTEuMTM3NzcyMiwtMi45ODIwODggMCwtNC4xMTk4NjEgTCAyMS45NDg3NjYsMjUuOTA3MzcyIDExLjEzMTkzOCwxNS4wOTA1NTEgYyAtMS4xMzc3NjQ3LC0xLjEzNzc3MSAtMS4xMzc3NjQ3LC0yLjk4MzU1MyAwLC00LjExOTg2MSAxLjEzNzc3NCwtMS4xMzc3NzIxIDIuOTgyMDk4LC0xLjEzNzc3MjEgNC4xMTk4NjUsMCBMIDI2LjA2ODYyOCwyMS43ODc1MTIgMzYuMzY5NzM5LDExLjQ4NjM5OSBjIDEuMTM3NzY4LC0xLjEzNzc2OCAyLjk4MjA5MywtMS4xMzc3NjggNC4xMTk4NjIsMCAxLjEzNzc2NywxLjEzNzc2OSAxLjEzNzc2NywyLjk4MjA5NCAwLDQuMTE5ODYyIEwgMzAuMTg4NDg5LDI1LjkwNzM3MiA0MS4wMDUzMSwzNi43MjQxOTcgYyAxLjEzNzc3MSwxLjEzNzc2NyAxLjEzNzc3MSwyLjk4MjA5MSAwLDQuMTE5ODY1IHoiIC8+Cjwvc3ZnPgo=" alt="close">
            </h2>
            <h3 class="no-select">&nbsp;<span></span></h3>
            <div class="stats_content"></div>
        </div>
    `);
    render($page);
    const $content = qs($page, ".stats_content");
    const $file = createElement(`
        <div class="file_row todo_color">
            <div class="file_path ellipsis"><span class="path"></span><span class="speed no-select"></span></div>
            <div class="file_state no-select"></div>
            <div class="file_control no-select"></div>
        </div>
   `);
    const updateTotal = {
        reset: () => {
            qs($page, ".grandTotal").innerText = 0;
            qs($page, ".completed").innerText = 0;
        },
        addToTotal: (n) => {
            const $total = qs($page, ".grandTotal");
            $total.innerText = parseInt($total.innerText) + n;
        },
        incrementCompleted: () => {
            const $completed = qs($page, ".completed");
            $completed.innerText = parseInt($completed.innerText) + 1;
        },
    };

    // feature1: close the queue
    onClick(qs($page, `img[alt="close"]`)).pipe(rxjs.tap(async() => {
        const cleanup = await animate($page, { time: 200, keyframes: slideYOut(50) });
        $content.innerHTML = "";
        $page.classList.add("hidden");
        updateTotal.reset();
        cleanup();
    })).subscribe();

    // feature2: setup the task queue in the dom
    workers$.subscribe(({ tasks }) => {
        if (tasks.length === 0) return;
        updateTotal.addToTotal(tasks.length);
        const $fragment = document.createDocumentFragment();
        for (let i = 0; i<tasks.length; i++) {
            const $task = assert.type($file.cloneNode(true), HTMLElement);
            $fragment.appendChild($task);
            $task.setAttribute("data-path", tasks[i]["path"]);
            $task.firstElementChild.firstElementChild.textContent = tasks[i]["path"]; // qs($todo, ".file_path span.path")
            $task.firstElementChild.firstElementChild.setAttribute("title", tasks[i]["path"]);
            $task.firstElementChild.nextElementSibling.classList.add("file_state_todo"); // qs($todo, ".file_state")
            $task.firstElementChild.nextElementSibling.textContent = t("Waiting");
        }
        $page.classList.remove("hidden");
        $content.appendChild($fragment);
    });

    // feature3: process tasks
    const ICON = {
        STOP: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+Cjxzdmcgdmlld0JveD0iMCAwIDM4NCA1MTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggc3R5bGU9ImZpbGw6ICM2MjY0Njk7IiBkPSJNMCAxMjhDMCA5Mi43IDI4LjcgNjQgNjQgNjRIMzIwYzM1LjMgMCA2NCAyOC43IDY0IDY0VjM4NGMwIDM1LjMtMjguNyA2NC02NCA2NEg2NGMtMzUuMyAwLTY0LTI4LjctNjQtNjRWMTI4eiIgLz4KPC9zdmc+Cg==",
        RETRY: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0Ij48cGF0aCBkPSJNMTcuNjUgNi4zNUMxNi4yIDQuOSAxNC4yMSA0IDEyIDRjLTQuNDIgMC03Ljk5IDMuNTgtNy45OSA4czMuNTcgOCA3Ljk5IDhjMy43MyAwIDYuODQtMi41NSA3LjczLTZoLTIuMDhjLS44MiAyLjMzLTMuMDQgNC01LjY1IDQtMy4zMSAwLTYtMi42OS02LTZzMi42OS02IDYtNmMxLjY2IDAgMy4xNC42OSA0LjIyIDEuNzhMMTMgMTFoN1Y0bC0yLjM1IDIuMzV6Ii8+PHBhdGggZD0iTTAgMGgyNHYyNEgweiIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==",
    };
    const $iconStop = createElement(`<img class="component_icon" draggable="false" src="${ICON.STOP}" alt="stop" title="${t("Aborted")}">`);
    const $iconRetry = createElement(`<img class="component_icon" draggable="false" src="${ICON.RETRY}" alt="retry">`);
    const $close = qs($page, `img[alt="close"]`);
    const updateDOMTaskProgress = ($task, text) => $task.firstElementChild.nextElementSibling.textContent = text;
    const updateDOMTaskSpeed = ($task, text) => $task.firstElementChild.firstElementChild.nextElementSibling.textContent = formatSpeed(text);
    const updateDOMGlobalSpeed = (function(workersSpeed) {
        let last = 0;
        return (nworker, currentWorkerSpeed) => {
            workersSpeed[nworker] = currentWorkerSpeed;
            if (new Date().getTime() - last <= 500) return;
            last = new Date().getTime();
            const speed = workersSpeed.reduce((acc, el) => acc + el, 0);
            const $speed = assert.type($page.firstElementChild?.nextElementSibling?.firstElementChild, HTMLElement);
            $speed.textContent = formatSpeed(speed);
        };
    }(new Array(MAX_WORKERS).fill(0)));
    const updateDOMGlobalTitle = ($page, text) => $page.firstElementChild.nextElementSibling.childNodes[0].textContent = text;
    const updateDOMWithStatus = ($task, { status, exec, nworker }) => {
        const cancel = () => exec.cancel();
        switch (status) {
        case "todo":
            break;
        case "doing":
            updateDOMTaskProgress($task, formatPercent(0));
            $task.firstElementChild.nextElementSibling.nextElementSibling.appendChild($iconStop);
            $iconStop.onclick = () => {
                cancel();
                $task.firstElementChild.nextElementSibling.nextElementSibling.classList.add("hidden");
            };
            $close.addEventListener("click", cancel);
            break;
        case "done":
            updateDOMGlobalSpeed(nworker, 0);
            updateDOMTaskProgress($task, t("Done"));
            updateDOMTaskSpeed($task, 0);
            $task.removeAttribute("data-path");
            $task.classList.remove("todo_color");
            $task.firstElementChild.nextElementSibling.nextElementSibling.classList.add("hidden");
            $close.removeEventListener("click", cancel);
            break;
        case "error":
            const $retry = assert.type($iconRetry.cloneNode(true), HTMLElement);
            updateDOMGlobalTitle($page, t("Error"));
            updateDOMGlobalSpeed(nworker, 0);
            updateDOMTaskProgress($task, t("Error"));
            updateDOMTaskSpeed($task, 0);
            $task.removeAttribute("data-path");
            $task.classList.remove("todo_color");
            $task.firstElementChild.nextElementSibling.nextElementSibling.firstElementChild.remove();
            $task.firstElementChild.nextElementSibling.nextElementSibling.appendChild($retry);
            $retry.onclick = () => { console.log("CLICK RETRY"); };
            $close.removeEventListener("click", cancel);
            $task.classList.add("error_color");
            break;
        default:
            assert.fail(`UNEXPECTED_STATUS status="${status}" path="${$task.getAttribute("path")}"`);
        }
    };

    let tasks = [];
    const reservations = new Array(MAX_WORKERS).fill(false);
    const processWorkerQueue = async(nworker) => {
        while (tasks.length > 0) {
            updateDOMGlobalTitle($page, t("Running")+"...");
            const task = nextTask(tasks);
            if (!task) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
            }
            const $task = qs($page, `[data-path="${task.path}"]`);
            const exec = task.exec({
                error: () => updateDOMWithStatus($task, { status: "error", nworker, exec: null }),
                progress: (progress) => updateDOMTaskProgress($task, formatPercent(progress)),
                speed: (speed) => {
                    updateDOMTaskSpeed($task, speed);
                    updateDOMGlobalSpeed(nworker, speed);
                },
            });
            updateDOMWithStatus($task, { exec, status: "doing", nworker });
            try {
                await exec.run(task);
                updateDOMWithStatus($task, { exec, status: "done", nworker });
            } catch (err) {
                updateDOMWithStatus($task, { exec, status: "error", nworker });
            }
            updateTotal.incrementCompleted();
            task.done = true;

            if (tasks.length === 0 && // no remaining tasks
                reservations.filter((t) => t === true).length === 1 // only for the last remaining job
            ) updateDOMGlobalTitle($page, t("Done"));
        }
    };
    const nextTask = (tasks) => {
        for (let i=0; i<tasks.length; i++) {
            const possibleTask = tasks[i];
            if (!possibleTask.ready()) continue;
            tasks.splice(i, 1);
            return possibleTask;
        }
        return null;
    };
    const noFailureAllowed = (fn) => fn().catch(() => noFailureAllowed(fn));
    workers$.subscribe(async({ tasks: newTasks }) => {
        tasks = tasks.concat(newTasks); // add new tasks to the pool
        while (true) {
            const nworker = reservations.indexOf(false);
            if (nworker === -1) break; // the pool of workers is already to its max
            reservations[nworker] = true;
            noFailureAllowed(processWorkerQueue.bind(null, nworker)).then(() => reservations[nworker] = false);
        }
    });
}

class IExecutor {
    contructor() {}
    cancel() { throw new Error("NOT_IMPLEMENTED"); }
    run() { throw new Error("NOT_IMPLEMENTED"); }
}

function workerImplFile({ error, progress, speed }) {
    return new class Worker extends IExecutor {
        constructor() {
            super();
            this.xhr = null;
            this.prevProgress = [];
        }

        /**
         * @override
         */
        cancel() {
            assert.type(this.xhr, XMLHttpRequest).abort();
        }

        /**
         * @override
         * TODO: retry logic on failed upload would be nice
         */
        async run({ file, path, virtual }) {
            const _file = await file();
            const chunkSize = (window.CONFIG["upload_chunk_size"] || 0) *1024*1024;
            const numberOfChunks = Math.ceil(_file.size / chunkSize);
            if (chunkSize === 0 || numberOfChunks === 0 || numberOfChunks === 1) {
                await this._execute({ file: _file, path, virtual, chunk: null, progress });
                return;
            }
            for (let i=0; i<numberOfChunks; i++) {
                const offset = chunkSize * i;
                const chunk = numberOfChunks - i - 1;
                await this._execute({
                    file: _file.slice(offset, offset+chunkSize),
                    virtual: {
                        before: () => {
                            if (i === 0) virtual.before();
                        },
                        afterSuccess: () => {
                            if (i === numberOfChunks - 1) virtual.afterSuccess();
                        },
                        afterError: () => virtual.afterError(),
                    },
                    progress: (p) => {
                        const chunksAlreadyDownloaded = i * chunkSize;
                        const currentChunkDownloaded = p / 100 * (
                            i !== numberOfChunks - 1 ? chunkSize : (_file.size % chunkSize) || chunkSize
                        );
                        progress(Math.floor(100 * (chunksAlreadyDownloaded + currentChunkDownloaded) / _file.size));
                    },
                    chunk,
                    path,
                });
                this.prevProgress = [];
            }
        }

        _execute({ file, path, virtual, chunk, progress }) {
            const xhr = new XMLHttpRequest();
            this.xhr = xhr;
            return new Promise((resolve, reject) => {
                xhr.open(
                    "POST",
                    forwardURLParams(
                        "api/files/cat?path=" + encodeURIComponent(path) +
                            (chunk === null ? "" : `&chunk=${chunk}`),
                        ["share"],
                    ),
                );
                xhr.withCredentials = true;
                xhr.setRequestHeader("X-Requested-With", "XmlHttpRequest");
                xhr.upload.onprogress = (e) => {
                    if (!e.lengthComputable) return;
                    const percent = Math.floor(100 * e.loaded / e.total);
                    progress(percent);
                    if (this.prevProgress.length === 0) {
                        this.prevProgress.push(e);
                        return;
                    }
                    this.prevProgress.push(e);

                    const calculateTime = (p1, pm1) => (p1.timeStamp - pm1.timeStamp)/1000;
                    const calculateBytes = (p1, pm1) => p1.loaded - pm1.loaded;
                    let avgSpeed = 0;
                    for (let i=1; i<this.prevProgress.length; i++) {
                        const p1 = this.prevProgress[i];
                        const pm1 = this.prevProgress[i-1];
                        avgSpeed += calculateBytes(p1, pm1) / calculateTime(p1, pm1);
                    }
                    avgSpeed = avgSpeed / (this.prevProgress.length - 1);
                    speed(avgSpeed);
                    if (e.timeStamp - this.prevProgress[0].timeStamp > 5000) {
                        this.prevProgress.shift();
                    }
                };
                xhr.upload.onabort = () => {
                    reject(ABORT_ERROR);
                    error(ABORT_ERROR);
                    virtual.afterError();
                };
                xhr.onload = () => {
                    progress(100);
                    if (xhr.status !== 200) {
                        virtual.afterError();
                        reject(new Error(xhr.statusText));
                        return;
                    }
                    virtual.afterSuccess();
                    resolve(null);
                };
                xhr.onerror = function(e) {
                    reject(new AjaxError("failed", e, "FAILED"));
                    virtual.afterError();
                };
                xhr.send(file);
            });
        }
    }();
}

function workerImplDirectory({ error, progress }) {
    return new class Worker extends IExecutor {
        constructor() {
            super();
            this.xhr = null;
        }

        /**
         * @override
         */
        cancel() {
            assert.type(this.xhr, XMLHttpRequest).abort();
        }

        /**
         * @override
         */
        run({ virtual, path }) {
            const xhr = new XMLHttpRequest();
            this.xhr = xhr;
            return new Promise((resolve, reject) => {
                xhr.open(
                    "POST",
                    forwardURLParams(
                        "api/files/mkdir?path=" + encodeURIComponent(path),
                        ["share"],
                    ),
                );
                xhr.withCredentials = true;
                xhr.setRequestHeader("X-Requested-With", "XmlHttpRequest");
                xhr.onerror = function(e) {
                    reject(new AjaxError("failed", e, "FAILED"));
                };

                let percent = 0;
                const id = setInterval(() => {
                    percent += 10;
                    if (percent >= 100) {
                        clearInterval(id);
                        return;
                    }
                    progress(percent);
                }, 100);
                xhr.upload.onabort = () => {
                    reject(ABORT_ERROR);
                    error(ABORT_ERROR);
                    clearInterval(id);
                    virtual.afterError();
                };
                xhr.onload = () => {
                    clearInterval(id);
                    progress(100);
                    if (xhr.status !== 200) {
                        virtual.afterError();
                        reject(new Error(xhr.statusText));
                        return;
                    }
                    virtual.afterSuccess();
                    resolve(null);
                };
                xhr.send(null);
            });
        }
    }();
}

async function processFiles(filelist) {
    const tasks = [];
    // let size = 0; // TODO
    const detectFiletype = (file) => {
        // the 4096 is an heuristic observed and taken from:
        // https://stackoverflow.com/questions/25016442
        // however the proposed answer is just wrong as it doesn't consider folder with
        // name such as: test.png and as Stackoverflow favor consanguinity with their
        // point system, I couldn't rectify the proposed answer. The following code is
        // actually working as expected
        if (file.size % 4096 !== 0) {
            return Promise.resolve("file");
        }
        return new Promise((resolve) => {
            const reader = new window.FileReader();
            const tid = setTimeout(() => reader.abort(), 1000);
            reader.onload = () => resolve("file");
            reader.onabort = () => resolve("file");
            reader.onerror = () => { resolve("directory"); clearTimeout(tid); };
            reader.readAsArrayBuffer(file);
        });
    };
    for (const currentFile of filelist) {
        const type = await detectFiletype(currentFile);
        let path = currentPath() + currentFile.name;
        let task = null;
        switch (type) {
        case "file":
            // size += currentFile.size;
            task = {
                type: "file",
                file: () => new Promise((resolve) => resolve(currentFile)),
                path,
                date: currentFile.lastModified,
                exec: workerImplFile,
                virtual: save(path, currentFile.size),
                done: false,
                ready: () => true,
                entry: currentFile,

            };
            break;
        case "directory":
            path += "/";
            task = {
                type: "directory",
                path,
                date: currentFile.lastModified,
                exec: workerImplDirectory,
                virtual: mkdir(path),
                done: false,
                ready: () => true,
            };
            break;
        default:
            assert.fail(`NOT_SUPPORTED type="${type}"`);
        }
        task = assert.truthy(task);
        task.virtual.before();
        tasks.push(task);
    }
    return { tasks, size: 0 };
}

async function processItems(itemList) {
    const bfs = async(queue) => {
        const tasks = [];
        let size = 0;
        const basepath = currentPath();
        while (queue.length > 0) {
            const entry = queue.shift();
            const path = basepath + entry.fullPath.substring(1);
            let task = {};
            if (entry === null) continue;
            else if (entry.isFile) {
                const entrySize = await new Promise((resolve) => {
                    if (typeof entry.getMetadata === "function") {
                        entry.getMetadata(({ size }) => resolve(size));
                    }
                    else resolve(null); // eg: firefox
                });
                task = {
                    type: "file",
                    file: () => new Promise((resolve, reject) => entry.file(
                        (file) => resolve(file),
                        (error) => reject(error),
                    )),
                    path,
                    exec: workerImplFile,
                    virtual: save(path, entrySize),
                    done: false,
                    ready: () => false,
                };
                size += entrySize;
            } else if (entry.isDirectory) {
                task = {
                    type: "directory",
                    path: path + "/",
                    exec: workerImplDirectory,
                    virtual: mkdir(path),
                    done: false,
                    ready: () => false,
                };
                queue = queue.concat(await new Promise((resolve) => {
                    entry.createReader().readEntries(resolve);
                }));
            } else {
                assert.fail("NOT_IMPLEMENTED - unknown entry type in ctrl_upload.js");
            }
            task.ready = () => {
                const isInDirectory = (filepath, folder) => folder.indexOf(filepath) === 0;
                for (let i=0; i<tasks.length; i++) {
                    // filter out tasks that are NOT dependencies of the current task
                    if (tasks[i].path === task.path) break;
                    else if (tasks[i].type === "file") continue;
                    else if (isInDirectory(tasks[i].path, task.path) === false) continue;

                    // block execution unless dependent task has completed
                    if (tasks[i].done === false) return false;
                }
                return true;
            };
            task.virtual.before();
            tasks.push(task);
        }
        return { tasks, size };
    };
    const entries = [];
    for (const item of itemList) entries.push(item.webkitGetAsEntry());
    return await bfs(entries);
}

function formatPercent(number) {
    return `${number}%`;
}

function formatSpeed(bytes, si = true) {
    const thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) {
        return bytes.toFixed(1) + "B/s";
    }
    const units = si
        ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
        : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
    let u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + units[u] + "/s";
}
