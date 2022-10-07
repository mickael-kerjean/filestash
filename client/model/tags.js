let DB = {
    tags: {
        "Bookmark": ["/home/user/Documents/", "/home/user/Documents/projects/"],
        "Customer": ["/home/user/Documents/projects/customers/"],
        "wiki": ["/home/user/Documents/test.txt"],
        "mit": ["/home/user/Documents/projects/customers/mit/"],
        "dhl": ["/home/user/Documents/projects/customers/dhl/"],
        "powerstone": ["/home/user/Documents/projects/customers/powerstone/"],
        "accounting": [
            "/home/user/Documents/projects/customers/mit/accounting/",
            "/home/user/Documents/projects/customers/dhl/accounting/",
            "/home/user/Documents/projects/customers/powerstone/accounting/",
        ]
    },
    weight: { // for sorting
        "Bookmark": 2,
    },
    share: null,
    backend: "__hash__",
};

class TagManager {
    all(tagPath = "/", maxSize = -1) {
        return Promise.resolve([]); // TODO: Remove this when ready

        if (tagPath == "/") {
            const scoreFn = (acc, el) => (acc + el.replace(/[^\/]/g, "").length);
            const tags = Object.keys(DB.tags).sort((a, b) => {
                if (DB.tags[a].length === DB.tags[b].length) {
                    return DB.tags[a].reduce(scoreFn, 0) - DB.tags[b].reduce(scoreFn, 0);
                }
                return DB.tags[a].length < DB.tags[b].length ? 1 : -1;
            });
            if(tags.length === 0) {
                return Promise.resolve(["Bookmark"]);
            } else if(tags.length >= 5) {
                return Promise.resolve(["All"].concat(tags.slice(0, 5)));
            }
            return Promise.resolve(tags);
        }
        // const path = this._tagPathStringToArray(tagPath);
        // Object.keys(DB.tags);
        // console.log(path);
        return Promise.resolve([
            "Bookmark", "wiki", "B", "C", "D", "E", "F"
        ]);
    }

    files(tagPath) {
        const tags = this._tagPathStringToArray(tagPath, false);
        if (tags.length === 0) return Promise.resolve([]);
        else if(tags.length > 1) return Promise.resolve([]); // TODO

        switch(tags[0]) {
        case "All":
            return this.all()
                .then((tags) => (tags.reduce((acc, el) => {
                    return DB.tags[el] ? acc.concat(DB.tags[el]) : acc;
                }, [])));
        default:
            return Promise.resolve(DB.tags[tags[0]] || []);
        }
    }

    _tagPathStringToArray(tagPathString, removeFirst = true) {
        return tagPathString
            .split("/")
            .filter((r) => r !== "" && (removeFirst ? r !== "All" : true));
    }

    add(tag, path) {
        if(Object.keys(DB.tags).indexOf(tag) === -1) {
            DB.tags[tag] = [];
        }
        if(!DB.tags[tag].indexOf(path) === -1) {
            DB.tags[tag].push(path);
        }
    }

    import(_DB) {
        DB = _DB;
    }

    export() {
        return Promise.resolve(DB);
    }
}

export const Tags = new TagManager();
