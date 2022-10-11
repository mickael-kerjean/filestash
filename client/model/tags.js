import { cache, currentShare, currentBackend } from "../helpers/";

class TagManager {
    all(tagPath = "/", maxSize = -1) {
        return cache.get(cache.FILE_TAG, [currentBackend(), currentShare()]).then((DB) => {
            if (DB === null) {
                return [];
            }

            if (tagPath == "/") {
                const scoreFn = (acc, el) => (acc + el.replace(/[^\/]/g, "").length);
                const tags = Object.keys(DB.tags).sort((a, b) => {
                    if (DB.tags[a].length === DB.tags[b].length) {
                        return DB.tags[a].reduce(scoreFn, 0) - DB.tags[b].reduce(scoreFn, 0);
                    }
                    return DB.tags[a].length < DB.tags[b].length ? 1 : -1;
                });
                if(tags.length === 0) {
                    return ["Bookmark"];
                } else if(tags.length >= 5) {
                    return ["All"].concat(tags.slice(0, 5));
                }
                return tags;
            }
            return [
                // "Bookmark", "wiki", "B", "C", "D", "E", "F"
            ];
        });
    }

    files(tagPath) {
        const tags = this._tagPathStringToArray(tagPath, false);
        if (tags.length === 0) return Promise.resolve([]);
        else if (tags.length > 1) return Promise.resolve([]); // TODO

        return cache.get(cache.FILE_TAG, [currentBackend(), currentShare()]).then((DB) => {
            if(!DB) return [];
            switch(tags[0]) {
            case "All":
                return this.all()
                    .then((tags) => (tags.reduce((acc, el) => {
                        return DB.tags[el] ? acc.concat(DB.tags[el]) : acc;
                    }, [])));
            default:
                return Promise.resolve(DB.tags[tags[0]] || []);
            }
        });
    }

    _tagPathStringToArray(tagPathString, removeFirst = true) {
        return tagPathString
            .split("/")
            .filter((r) => r !== "" && (removeFirst ? r !== "All" : true));
    }

    addTagToFile(tag, path) {
        return cache.upsert(cache.FILE_TAG, [currentBackend(), currentShare()], (DB) => {
            if(Object.keys(DB.tags).indexOf(tag) === -1) {
                DB.tags[tag] = [];
            }
            if(!DB.tags[tag].indexOf(path) === -1) {
                DB.tags[tag].push(path);
            }
            return DB;
        });
    }

    removeTagFromFile(tag, path) {
        return cache.upsert(cache.FILE_TAG, [currentBackend(), currentShare()], (DB) => {
            if(!DB.tags[tag]) return;
            const idx = DB.tags[tag].indexOf(path);
            DB.tags[tag].splice(idx, 1);
            if (DB.tags[tag].length === 0) {
                delete DB.tags[tag];
                delete DB.weight[tag];
            }
            return DB;
        });
    }

    import(DB) {
        return cache.upsert(cache.FILE_TAG, [currentBackend(), currentShare()], () => {
            return DB;
        });
    }

    export() {
        const key = [currentBackend(), currentShare()];
        return cache.get(cache.FILE_TAG, key)
            .then((a) => {
                if (a === null) {
                    return {tags: {}, weight: {}, share: key[1], backend: key[0]}
                }
                return a;
            });
    }
}

export const Tags = new TagManager();
