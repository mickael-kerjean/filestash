import { setup_cache_state } from ".";
import { currentBackend, currentShare } from "./cache_state.js";

const DB_VERSION = 4;
const FILE_PATH = "file_path";
const FILE_CONTENT = "file_content";
const FILE_TAG = "file_tag";

function DataFromIndexedDB() {
    this.db = null;
    this.FILE_PATH = FILE_PATH;
    this.FILE_CONTENT = FILE_CONTENT;
    this.FILE_TAG = FILE_TAG;
    return this._init();
}
function DataFromMemory() {
    this.data = {};
    this.FILE_PATH = FILE_PATH;
    this.FILE_CONTENT = FILE_CONTENT;
    this.FILE_TAG = FILE_TAG;
    return this._init();
}

DataFromIndexedDB.prototype._init = function() {
    const request = indexedDB.open("filestash", DB_VERSION);
    request.onupgradeneeded = function(event) {
        let store;
        const db = event.target.result;

        if (event.oldVersion == 1) {
            // we've change the schema on v2 adding an index, let's flush
            // to make sure everything will be fine
            db.deleteObjectStore(FILE_PATH);
            db.deleteObjectStore(FILE_CONTENT);
        } else if (event.oldVersion == 2) {
            // we've change the primary key to be a (path,share)
            db.deleteObjectStore(FILE_PATH);
            db.deleteObjectStore(FILE_CONTENT);
        } else if (event.oldVersion == 3) {
            // we've added a FILE_TAG to store tag related data and update
            // keyPath to have "backend"
            db.deleteObjectStore(FILE_PATH);
            db.deleteObjectStore(FILE_CONTENT);
        }

        store = db.createObjectStore(FILE_PATH, { keyPath: ["backend", "share", "path"] });
        store.createIndex("idx_path", ["backend", "share", "path"], { unique: true });

        store = db.createObjectStore(FILE_CONTENT, { keyPath: ["backend", "share", "path"] });
        store.createIndex("idx_path", ["backend", "share", "path"], { unique: true });

        store = db.createObjectStore(FILE_TAG, { keyPath: ["backend", "share"] });
        store.createIndex("idx_path", ["backend", "share"], { unique: true });
    };

    this.db = new Promise((done, err) => {
        request.onsuccess = (e) => {
            done(e.target.result);
        };
        request.onerror = (e) => err("INDEXEDDB_NOT_SUPPORTED");
    });
};

DataFromMemory.prototype._init = function() {
};

/*
 * Fetch a record using its path, can be either a file path or content
 */
DataFromIndexedDB.prototype.get = function(type, key) {
    if (type !== FILE_PATH && type !== FILE_CONTENT && type !== FILE_TAG) return Promise.reject();

    return this.db.then((db) => {
        const tx = db.transaction(type, "readonly");
        const store = tx.objectStore(type);
        const query = store.get(key);
        return new Promise((done, error) => {
            query.onsuccess = (e) => {
                done(query.result || null);
            };
            query.onerror = () => done();
        });
    });
};
DataFromMemory.prototype.get = function(type, key) {
    if (type !== FILE_PATH && type !== FILE_CONTENT && type !== FILE_TAG) return Promise.reject();

    const data = this.data[type] || null;
    if (data === null) {
        return Promise.resolve(null);
    }
    const value = data[key.join("_")] || null;
    if (value === null) {
        return Promise.resolve(null);
    }
    return new Promise((done) => {
        requestAnimationFrame(() => done(value));
    });
};

DataFromIndexedDB.prototype.update = function(type, key, fn, exact = true) {
    if (type !== FILE_PATH && type !== FILE_CONTENT && type !== FILE_TAG) return Promise.reject();

    return this.db.then((db) => {
        const tx = db.transaction(type, "readwrite");
        const store = tx.objectStore(type);
        const range = exact === true? IDBKeyRange.only(key) : IDBKeyRange.bound(
            [key[0], key[1]],
            [key[0], key[1]+"\uFFFF"],
            false, true,
        );
        const request = store.openCursor(range);
        let new_data = null;
        return new Promise((done, err) => {
            request.onsuccess = function(event) {
                const cursor = event.target.result;
                if (!cursor) return done(new_data);
                new_data = fn(cursor.value || null);
                cursor.delete([key[0], cursor.value.path]);
                store.put(new_data);
                cursor.continue();
            };
        });
    }).catch(() => Promise.resolve());
};

DataFromMemory.prototype.update = function(type, key, fn, exact = true) {
    if (type !== FILE_PATH && type !== FILE_CONTENT && type !== FILE_TAG) return Promise.reject();

    const data = this.data[type];
    if (data === undefined) {
        return Promise.resolve(null);
    }

    const k = key.join("_");
    if (exact === true) {
        if (this.data[type][k] !== undefined) this.data[type][k] = fn(data[k]);
    } else {
        for (const _k in data) {
            if (_k.indexOf(k) === 0) {
                this.data[type][_k] = fn(data[_k]);
            }
        }
    }
    return Promise.resolve();
};

DataFromIndexedDB.prototype.upsert = function(type, key, fn) {
    if (type !== FILE_PATH && type !== FILE_CONTENT && type !== FILE_TAG) return Promise.reject();

    return this.db.then((db) => {
        const tx = db.transaction(type, "readwrite");
        const store = tx.objectStore(type);
        const query = store.get(key);
        return new Promise((done, error) => {
            query.onsuccess = (e) => {
                const new_data = fn(query.result || null);
                if (!new_data) return done(query.result || null);

                const request = store.put(new_data);
                request.onsuccess = () => done(new_data);
                request.onerror = (e) => error(e);
            };
            query.onerror = error;
        });
    });
};
DataFromMemory.prototype.upsert = function(type, key, fn) {
    if (type !== FILE_PATH && type !== FILE_CONTENT && type !== FILE_TAG) return Promise.reject();

    const db = this.data[type] || null;
    if (db === null) {
        this.data[type] = {};
    }
    const k = key.join("_");
    const new_data = fn(this.data[type][k]);
    this.data[type][k] = fn(new_data);
    return Promise.resolve(new_data);
};

DataFromIndexedDB.prototype.add = function(type, key, data) {
    if (type !== FILE_PATH && type !== FILE_CONTENT && type !== FILE_TAG) return Promise.reject();

    return this.db.then((db) => {
        return new Promise((done, error) => {
            const tx = db.transaction(type, "readwrite");
            const store = tx.objectStore(type);
            const request = store.put(data);
            request.onsuccess = () => done(data);
            request.onerror = (e) => error(e);
        });
    }).catch(() => Promise.resolve());
};
DataFromMemory.prototype.add = function(type, key, data) {
    if (type !== FILE_PATH && type !== FILE_CONTENT && type !== FILE_TAG) return Promise.reject();

    if (this.data[type] === undefined) {
        this.data[type] = {};
    }
    this.data[type][key.join("_")] = data;
    return Promise.resolve(data);
};

DataFromIndexedDB.prototype.remove = function(type, key, exact = true) {
    if (type !== FILE_PATH && type !== FILE_CONTENT && type !== FILE_TAG) return Promise.reject();

    return this.db.then((db) => {
        const tx = db.transaction(type, "readwrite");
        const store = tx.objectStore(type);

        if (exact === true) {
            const req = store.delete(key);
            return new Promise((done, err) => {
                req.onsuccess = () => done();
                req.onerror = err;
            });
        } else {
            const request = store.openCursor(IDBKeyRange.bound(
                [key[0], key[1], key[2]],
                [key[0], key[1], key[2]+"\uFFFF"],
                true, true,
            ));
            return new Promise((done, err) => {
                request.onsuccess = function(event) {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete([key[0], cursor.value.path]);
                        cursor.continue();
                    } else {
                        done();
                    }
                };
            });
        }
    }).catch(() => Promise.resolve());
};
DataFromMemory.prototype.remove = function(type, key, exact = true) {
    if (type !== FILE_PATH && type !== FILE_CONTENT && type !== FILE_TAG) return Promise.reject();

    const data = this.data[type] || null;
    if (data === null) {
        return Promise.resolve();
    }
    const k = key.join("_");
    if (exact === true) {
        delete data[k];
    }
    for (const _k in data) {
        if (_k.indexOf(k) === 0) {
            delete data[_k];
        }
    }
    return Promise.resolve();
};

DataFromIndexedDB.prototype.fetchAll = function(fn, type = FILE_PATH, key) {
    if (type !== FILE_PATH && type !== FILE_CONTENT && type !== FILE_TAG) return Promise.reject();

    return this.db.then((db) => {
        const tx = db.transaction([type], "readonly");
        const store = tx.objectStore(type);
        const index = store.index("idx_path");
        const request = index.openCursor(IDBKeyRange.bound(
            [key[0], key[1], key[2]],
            [key[0], key[1], key[2]+("z".repeat(5000))],
        ));

        return new Promise((done, error) => {
            request.onsuccess = function(event) {
                const cursor = event.target.result;
                if (!cursor) {
                    return done();
                }
                const ret = fn(cursor.value);
                if (ret === false) {
                    return done();
                }
                cursor.continue();
            };
            request.onerror = () => {
                done();
            };
        });
    }).catch(() => Promise.resolve());
};
DataFromMemory.prototype.fetchAll = function(fn, type = FILE_PATH, key) {
    if (type !== FILE_PATH && type !== FILE_CONTENT && type !== FILE_TAG) return Promise.reject();

    const data = this.data[type] || null;
    if (data === null) {
        return Promise.resolve();
    }
    const k = key.join("_");
    for (const _k in data) {
        if (_k.indexOf(k) === 0) {
            const ret = fn(data[_k]);
            if (ret === false) {
                return Promise.resolve();
            }
        }
    }
    return Promise.resolve();
};

DataFromIndexedDB.prototype.destroy = function() {
    return new Promise((done, err) => {
        this.db.then((db) => {
            purgeAll(db, FILE_PATH);
            purgeAll(db, FILE_CONTENT);
            // We keep FILE_TAG as this was user generated and potentially frustrating
            // for users if they were to lose this
            setup_cache_state("");
        });
        done();

        function purgeAll(db, type) {
            const tx = db.transaction(type, "readwrite");
            const store = tx.objectStore(type);
            store.clear();
        }
    });
};

DataFromMemory.prototype.destroy = function() {
    this.data = {};
    return Promise.resolve();
};

export let cache = null;

export function setup_cache() {
    cache = new DataFromMemory();
    if ("indexedDB" in window && window.indexedDB !== null) {
        cache = new DataFromIndexedDB();
        return Promise.all([cache.db, setup_cache_state()])
            .then(() => {
                const currentPath = decodeURIComponent(location.pathname.replace(/^\/.*?\//, "/"));
                return cache.get(
                    FILE_PATH,
                    [currentBackend(), currentShare(), currentPath],
                ).then((response) => {
                    if (!response || !response.results) return;
                    for (let i=0; i<response.results.length; i++) {
                        if (response.results[i].icon !== "loading") continue
                        // when we see a dirty cache sync issue, we flush the entire thing as nicely recover
                        // from such issue would be a dirty hack. A known case for this is when a user
                        // force quit the browser during an upload, in that scenario, it's much simpler to
                        // assume our cache is unreliable and start fresh
                        return Promise.all([
                            cache.remove(FILE_PATH, [currentBackend(), currentShare(), "/"], false),
                            cache.remove(FILE_CONTENT, [currentBackend(), currentShare(), "/"], false),
                        ]);
                    }
                    return
                });
            })
            .catch((err) => {
                if (err === "INDEXEDDB_NOT_SUPPORTED") {
                    // Firefox in private mode act like if it supports indexedDB but
                    // is throwing that string as an error if you try to use it ...
                    // so we fallback with our basic ram cache
                    cache = new DataFromMemory();
                    return setup_cache_state();
                }
                throw err;
            })
    }
    return setup_cache_state();
}
