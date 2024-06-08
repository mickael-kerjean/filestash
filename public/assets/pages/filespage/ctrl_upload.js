import { createElement, createFragment, createRender } from "../../lib/skeleton/index.js";
import { animate, slideYOut } from "../../lib/animate.js";
import rxjs, { effect, onClick } from "../../lib/rx.js";
import { loadCSS } from "../../helpers/loader.js";
import { qs } from "../../lib/dom.js";
import { AjaxError } from "../../lib/error.js";
import assert from "../../lib/assert.js";
import t from "../../locales/index.js";

export default function(render) {
    const $page = createFragment(`
        <div is="component_filezone"></div>
        <div is="component_upload_fab"></div>
    `);
    const tasks$ = new rxjs.BehaviorSubject([]);

    if (!document.querySelector(`[is="component_upload_queue"]`)) {
        const $queue = createElement(`<div is="component_upload_queue"></div>`);
        document.body.appendChild($queue);
        componentUploadQueue(createRender($queue), { tasks$ });
    }

    componentFilezone(createRender($page.children[0]), { tasks$ });
    componentUploadFAB(createRender($page.children[1]), { tasks$ });
    render($page);
}

export function init() {
    return loadCSS(import.meta.url, "./ctrl_upload.css");
}

function componentUploadFAB(render, { tasks$ }) {
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
        rxjs.tap(async (e) => tasks$.next(await processFiles(e.target.files)))
    ));
    render($page);
}

function componentFilezone(render, { tasks$ }) {
    const $target = document.body.querySelector(`[data-bind="filemanager-children"]`);
    $target.ondragenter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        $target.classList.add("dropzone");
    };
    $target.ondragover = (e) => {
        e.preventDefault();
    };
    $target.ondragleave = () => {
        // console.log("DRAGLEAVE");
    };
    $target.ondrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const loadID = setTimeout(() => render(createElement("<div>LOADING</div>")), 2000);
        if (e.dataTransfer.items instanceof window.DataTransferItemList) tasks$.next(await processItems(e.dataTransfer.items));
        else if (e.dataTransfer.files instanceof window.FileList) tasks$.next(await processFiles(e.dataTransfer.files));
        else assert.fail("NOT_IMPLEMENTED - unknown entry type in ctrl_upload.js", entry);
        $target.classList.remove("dropzone");
        clearTimeout(loadID);
        render(createFragment(""));
    };
}

const MAX_WORKERS = 4;

function componentUploadQueue(render, { tasks$ }) {
    const $page = createElement(`
        <div class="component_upload hidden">
            <h2 class="no-select">${t("Current Upload")}
                <div class="count_block">
                    <span class="completed">24</span>
                    <span class="grandTotal">24</span>
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
            <div class="file_path"><span class="path"></span><span class="speed no-select"></span></div>
            <div class="file_state no-select"></div>
            <div class="file_control no-select"></div>
        </div>
   `);

    // feature1: close the queue and stop the upload
    effect(onClick(qs($page, `img[alt="close"]`)).pipe(
        rxjs.mergeMap(() => animate($page, { time: 200, keyframes: slideYOut(50) })),
        rxjs.tap(() => $page.classList.add("hidden")),
    ));

    // feature2: setup the task queue in the dom
    effect(tasks$.asObservable().pipe(rxjs.tap((tasks) => {
        if (tasks.length === 0) return;
        $page.classList.remove("hidden");
        const $fragment = document.createDocumentFragment();
        for (let i = 0; i<tasks.length; i++) {
            const $task = $file.cloneNode(true);
            $fragment.appendChild($task);
            $task.setAttribute("data-path", tasks[i]["path"]);
            $task.firstElementChild.firstElementChild.textContent = tasks[i]["path"]; // qs($todo, ".file_path span.path")
            $task.firstElementChild.nextElementSibling.classList.add("file_state_todo"); // qs($todo, ".file_state")
            $task.firstElementChild.nextElementSibling.textContent = t("Waiting");
        }
        $content.appendChild($fragment);
    })));

    // feature3: process tasks
    const $icon = createElement(`<img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+Cjxzdmcgdmlld0JveD0iMCAwIDM4NCA1MTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggc3R5bGU9ImZpbGw6ICM2MjY0Njk7IiBkPSJNMCAxMjhDMCA5Mi43IDI4LjcgNjQgNjQgNjRIMzIwYzM1LjMgMCA2NCAyOC43IDY0IDY0VjM4NGMwIDM1LjMtMjguNyA2NC02NCA2NEg2NGMtMzUuMyAwLTY0LTI4LjctNjQtNjRWMTI4eiIgLz4KPC9zdmc+Cg==" alt="stop" title="${t("Aborted")}">`)
    const $close = qs($page, `img[alt="close"]`);
    const updateDOMTaskProgress = ($task, text) => $task.firstElementChild.nextElementSibling.textContent = text;
    const updateDOMTaskSpeed = ($task, text) => $task.firstElementChild.firstElementChild.nextElementSibling.textContent = formatSpeed(text);
    const updateDOMGlobalSpeed = function (workersSpeed) {
        return (nworker, currentWorkerSpeed) => {
            workersSpeed[nworker] = currentWorkerSpeed;
            const speed = workersSpeed.reduce((acc, el) => acc + el, 0);
            $page.firstElementChild.nextElementSibling.firstElementChild.textContent = formatSpeed(speed);
        };
    }(new Array(MAX_WORKERS).fill(0));
    const updateDOMGlobalTitle = ($page, text) => $page.firstElementChild.nextElementSibling.childNodes[0].textContent = text;
    const updateDOMWithStatus = ($task, { status, exec, nworker }) => {
        const cancel = () => exec.cancel();
        switch (status) {
        case "todo":
            break;
        case "doing":
            updateDOMTaskProgress($task, formatPercent(0));
            const $stop = $icon.cloneNode(true);
            $task.firstElementChild.nextElementSibling.nextElementSibling.appendChild($stop);
            $stop.onclick = () => {
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
            updateDOMGlobalTitle($page, t("Error")); // TODO: only apply if err is not abort type
            updateDOMGlobalSpeed(nworker, 0);
            updateDOMTaskProgress($task, t("Error"));
            updateDOMTaskSpeed($task, 0);
            $task.removeAttribute("data-path");
            $task.classList.remove("todo_color");
            $task.classList.add("error_color");
            $close.removeEventListener("click", cancel);
            break;
        default:
            assert.fail(`UNEXPECTED_STATUS status="${status}" path="${$task.getAttribute("path")}"`);
        }
    };

    let tasks = [];
    const reservations = new Array(MAX_WORKERS).fill(false);
    const processWorkerQueue = async (nworker) => {
        while(tasks.length > 0) {
            updateDOMGlobalTitle($page, t("Running")+"...")
            const task = tasks.shift();
            const $task = qs($page, `[data-path="${task.path}"]`);
            const exec = task.exec({
                error: (err) => updateDOMWithStatus($task, { status: "error", nworker }),
                progress: (progress) => updateDOMTaskProgress($task, formatPercent(progress)),
                speed: (speed) => {
                    updateDOMTaskSpeed($task, speed);
                    updateDOMGlobalSpeed(nworker, speed);
                },
            });
            updateDOMWithStatus($task, { exec, status: "doing", nworker });
            await exec.run(task);
            updateDOMWithStatus($task, { exec, status: "done", nworker });

            if (tasks.length === 0 // no remaining tasks
                && reservations.filter((t) => t === true).length === 1 // only for the last remaining job
            ) updateDOMGlobalTitle($page, t("Done"));
        }
    };
    const noFailureAllowed = (fn) => fn().catch(() => noFailureAllowed(fn));
    effect(tasks$.pipe(rxjs.tap(async (newTasks) => {
        tasks = tasks.concat(newTasks); // add new tasks to the pool
        while(true) {
            const nworker = reservations.indexOf(false);
            if (nworker === -1) break; // the pool of workers is already to its max
            reservations[nworker] = true;
            noFailureAllowed(processWorkerQueue.bind(this, nworker)).then(() => reservations[nworker] = false);
        }
    })));
}

class IExecutor {
    contructor() {}
    cancel() { throw new Error("NOT_IMPLEMENTED"); }
    run() { throw new Error("NOT_IMPLEMENTED"); }
}

const blob = new Blob(new Array(2 * 1024 * 1024).fill('a'), { type: "text/plain" });
function workerImplFile({ error, progress, speed }) {
    return new class Worker extends IExecutor {
        constructor() {
            super();
            this.xhr = null;
            this.prevProgress = [];
        }

        cancel() {
            this.xhr.abort();
        }

        run({ stream }) {
            return new Promise((done, err) => {
                console.log("EXECUTE", stream)
                this.xhr = new XMLHttpRequest();
                this.xhr.open("POST", "http://localhost:8334/api/files/cat?path=" + encodeURIComponent("/filestashtest/test/dummy.txt"));
                this.xhr.withCredentials = true;
                this.xhr.setRequestHeader("X-Requested-With", "XmlHttpRequest");
                this.xhr.onerror = function(e) {
                    err(new AjaxError("failed", e, "FAILED"));
                };
                this.xhr.upload.onabort = () => {
                    err(new AjaxError("aborted", null, "ABORTED"));
                    error(new AjaxError("aborted", null, "ABORTED"));
                };
                this.xhr.upload.onprogress = (e) => {
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
                    const lastIdx = this.prevProgress.length - 1;
                    let avgSpeed = 0;
                    for (let i=1; i<this.prevProgress.length; i++) {
                        const p1 = this.prevProgress[i];
                        const pm1 = this.prevProgress[i-1];
                        avgSpeed += calculateBytes(p1, pm1) / calculateTime(p1, pm1)
                    }
                    avgSpeed = avgSpeed / (this.prevProgress.length - 1);
                    speed(avgSpeed);
                    if (e.timeStamp - this.prevProgress[0].timeStamp > 5000) {
                        this.prevProgress.shift();
                    }
                };
                // this.xhr.onreadystatechange = () => console.log(this.xhr.readyState);
                this.xhr.onload = () => {
                    progress(100);
                    done();
                };
                this.xhr.send(stream);
            });

        }
    }
}
function workerImplDirectory({ error, progress }) {
    return new class Worker extends IExecutor {
        constructor() {
            super();
            this.xhr = null;
        }

        cancel() {
            this.xhr.abort();
        }

        run() {
            return new Promise((done, err) => {
                this.xhr = new XMLHttpRequest();
                this.xhr.open("POST", "http://localhost:8334/api/files/mkdir?path=" + encodeURIComponent("/filestashtest/test/dummy.txt"));
                this.xhr.withCredentials = true;
                this.xhr.setRequestHeader("X-Requested-With", "XmlHttpRequest");
                this.xhr.onerror = function(e) {
                    err(new AjaxError("failed", e, "FAILED"));
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
                this.xhr.upload.onabort = () => {
                    err(new AjaxError("aborted", null, "ABORTED"));
                    error(new AjaxError("aborted", null, "ABORTED"));
                    clearInterval(id);
                };
                this.xhr.onload = () => {
                    clearInterval(id);
                    progress(100);
                    setTimeout(() => done(), 500);
                };
                console.log(stream)
                this.xhr.send(null);
            });

        }
    }
}

async function processFiles(filelist) {
    const files = [];
    const detectFiletype = (file) => {
        // the 4096 is an heuristic I've observed and taken from:
        // https://stackoverflow.com/questions/25016442
        // however the proposed answer is just wrong as it doesn't consider folder with
        // name such as: test.png and as Stackoverflow favor consanguinity with their
        // point system, I couldn't rectify the proposed answer. The following code is
        // actually working as expected
        if (file.size % 4096 !== 0) {
            return Promise.resolve("file");
        }
        return new Promise((done, err) => {
            const reader = new window.FileReader();
            const tid = setTimeout(() => reader.abort(), 1000);
            reader.onload = () => done("file");
            reader.onabort = () => done("file");
            reader.onerror = () => { done("directory"); clearTimeout(tid); }
            reader.readAsArrayBuffer(file);
        });
    }
    for (const currentFile of filelist) {
        const type = await detectFiletype(currentFile);
        const file = { type, date: currentFile.lastModified, name: currentFile.name, path: currentFile.name };
        if (type === "file") file.size = currentFile.size;
        else if (type === "directory") file.path += "/";
        else assert.fail(`NOT_SUPPORTED type="${type}"`, type);
        file.stream = currentFile // TODO: put a file object in there
        file.exec = workerImplFile.bind(file);
        files.push(file);
    }
    return files;
}

async function processItems(itemList) {
    const bfs = async (queue) => {
        const fs = [];
        let path = ""
        while (queue.length > 0) {
            const entry = queue.shift();
            const path = entry.fullPath.substring(1);
            if (entry === null) continue;
            else if (entry.isFile) {
                const file = await new Promise((done) => entry.file((file) => done(file)));
                fs.push({ type: "file", path, exec: workerImplFile, stream: file });
                continue;
            } else if (entry.isDirectory) {
                fs.push({ type: "directory", path: path + "/", exec: workerImplDirectory });
                queue = queue.concat(await new Promise((done) => {
                    entry.createReader().readEntries(done)
                }));
                continue;
            }
            assert.fail("NOT_IMPLEMENTED - unknown entry type in ctrl_upload.js", entry);
        }
        return fs;
    }
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
    const units = si ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"] :
        ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
    let u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + units[u] + "/s";
}
