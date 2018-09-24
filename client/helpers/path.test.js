const p = require("./path");

describe("Path", () => {
    it("can create beautiful with proper convention for folder or file", () => {
        let res = p.pathBuilder("/test/polo", "polo", "file");
        expect(res).toBe("/test/polo/polo");

        res = p.pathBuilder("/test/polo", "polo", "directory");
        expect(res).toBe("/test/polo/polo/");
    });

    it("can extract the filename from a path", () => {
        let res = p.basename("/var/www/html/test")
        expect(res).toBe("test");
    });

    it("can extract the dirname from a path", () => {
        let res = p.basename("/var/www/html/test/")
        expect(res).toBe("test");
    });

    it("can transform 2 absolute path as relative", () => {
        let res = p.absoluteToRelative("/var/www/", "/var/www/html/test");
        expect(res).toBe("./html/test");

        res = p.absoluteToRelative("/var/www/html/test/", "/var/www/polo");
        expect(res).toBe("../../polo")

        res = p.absoluteToRelative("/var/www/html/test", "/var/www/polo");
        expect(res).toBe("../polo")

        res = p.absoluteToRelative("/var/www/html/test", "/var/www/polo/");
        expect(res).toBe("../polo/")
        
        res = p.absoluteToRelative("/var/www/", "/var/www/html/test/");
        expect(res).toBe("./html/test/");

        res = p.absoluteToRelative("/var/www/", "/var/www/");
        expect(res).toBe("./");

        res = p.absoluteToRelative("/var/www", "/var/www/");
        expect(res).toBe("./www/");

        res = p.absoluteToRelative("/var/test/", "/var/www");
        expect(res).toBe("../www");
    });

});
