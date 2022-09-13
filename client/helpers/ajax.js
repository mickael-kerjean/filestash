export function http_get(url, type = "json", params) {
    return new Promise((done, err) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", window.sub_folder + url, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader("X-Requested-With", "XmlHttpRequest");
        xhr.onerror = function() {
            handle_error_response(xhr, err);
        };
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== XMLHttpRequest.DONE) {
                return;
            } else if (xhr.status !== 200) {
                const isAborted = xhr.onerror === null;
                if (isAborted) return
                handle_error_response(xhr, err);
                return;
            }

            if (type !== "json") {
                done(xhr.responseText);
                return
            }
            try {
                const data = JSON.parse(xhr.responseText);
                if ("status" in data === false || data.status === "ok") {
                    done(data);
                } else {
                    err(data);
                }
            } catch (error) {
                err({ message: "oups", trace: error });
            }
        };
        xhr.send(null);
        if (params && params.abort) {
            params.abort.signal.onabort = () => {
                xhr.onerror = null;
                err({ message: "aborted", code: "ABORTED" });
                xhr.abort();
            };
        }
    });
}

export function http_post(url, data, type = "json", params) {
    return new Promise((done, err) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", window.sub_folder + url, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader("X-Requested-With", "XmlHttpRequest");
        if (type === "json") {
            data = JSON.stringify(data);
            xhr.setRequestHeader("Content-Type", "application/json");
        }
        if (params && params.progress) {
            xhr.upload.addEventListener("progress", params.progress, false);
        }
        xhr.onerror = function() {
            handle_error_response(xhr, err);
        };
        xhr.onload = function() {
            if (xhr.readyState !== XMLHttpRequest.DONE) {
                return;
            } else if (xhr.status !== 200) {
                const isAborted = xhr.onerror === null;
                if (isAborted) return
                handle_error_response(xhr, err);
                return;
            }
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.status !== "ok") {
                    err(data);
                    return;
                }
                done(data);
            } catch (error) {
                err({ message: "oups", trace: error });
            }
        };
        xhr.send(data);
        if (params && params.abort) {
            params.abort(() => {
                xhr.onerror = null;
                xhr.abort();
                err({ message: "aborted", code: "ABORTED" });
            });
        }
    });
}

export function http_delete(url) {
    return new Promise((done, err) => {
        const xhr = new XMLHttpRequest();
        xhr.open("DELETE", window.sub_folder + url, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader("X-Requested-With", "XmlHttpRequest");
        xhr.onerror = function() {
            handle_error_response(xhr, err);
        };
        xhr.onload = function() {
            if (xhr.readyState !== XMLHttpRequest.DONE) {
                return;
            } else if (xhr.status !== 200) {
                handle_error_response(xhr, err);
                return;
            }
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.status !== "ok") {
                    err(data);
                    return
                }
                done(data);
            } catch (error) {
                err({ message: "oups", trace: error });
            }
        };
        xhr.send(null);
    });
}

export function http_options(url) {
    return new Promise((done, err) => {
        const xhr = new XMLHttpRequest();
        xhr.open("OPTIONS", window.sub_folder + url, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader("X-Requested-With", "XmlHttpRequest");
        xhr.onerror = function() {
            handle_error_response(xhr, err);
        };
        xhr.onload = function() {
            if (xhr.readyState !== XMLHttpRequest.DONE) {
                return
            } else if (xhr.status !== 200) {
                handle_error_response(xhr, err);
                return;
            }
            done(
                xhr.getAllResponseHeaders()
                    .split("\n")
                    .reduce((acc, r) => {
                        const a = r.split(": ");
                        acc[a[0]] = a[1];
                        return acc;
                    }, {}),
            );
        };
        xhr.send(null);
    });
}


function handle_error_response(xhr, err) {
    const response = (function(content) {
        let message = content;
        try {
            message = JSON.parse(content);
        } catch (err) {
            return { message: content };
        }
        return message || { message: "empty response" };
    })(xhr.responseText);

    const message = response.message || null;

    if (navigator.onLine === false) {
        err({ message: "Connection Lost", code: "NO_INTERNET" });
        return;
    }
    switch(xhr.status) {
    case 500:
        err({
            message: message || "Oups something went wrong with our servers",
            code: "INTERNAL_SERVER_ERROR",
        });
        break;
    case 401:
        err({ message: message || "Authentication error", code: "Unauthorized" });
        break;
    case 403:
        err({ message: message || "You can\'t do that", code: "Forbidden" });
        break;
    case 413:
        err({ message: message || "Payload too large", code: "PAYLOAD_TOO_LARGE" });
    case 502:
        err({ message: message || "The destination is acting weird", code: "BAD_GATEWAY" });
    case 409:
        if (response["error_summary"]) { // dropbox way to say doesn't exist
            err({ message: "Doesn\'t exist", code: "UNKNOWN_PATH" });
            return
        }
        err({ message: message || "Oups you just ran into a conflict", code: "CONFLICT" });
    case 0:
        switch(xhr.responseText) {
        case "":
            err({
                message: "Service unavailable, if the problem persist, contact your administrator",
                code: "INTERNAL_SERVER_ERROR",
            });
            break;
        default:
            err({ message: xhr.responseText, code: "INTERNAL_SERVER_ERROR" });
        }
    default:
        err({ message: message || "Oups something went wrong" });
    }
}
