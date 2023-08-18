import exec from "./ctrl_boot_backoffice.js";

describe("ctrl::boot", () => {
    it("runs", async() => {
        const start = new Date();
        await exec();
        expect(new Date() - start).toBeLessThan(100);
    });

    it("reset the history", () => {
        expect(window.history.state).toEqual({});
    });

    it("setup the dom", () => {
        expect(
            document.body.classList.contains("touch-no") ||
                document.body.classList.contains("touch-yes")
        ).toBe(true);
    });

    it("setup the error screen", () => {
        expect(typeof window.onerror).toBe("function");
        window.onerror("__MESSAGE__");
        expect(document.body.outerHTML).toContain("__MESSAGE__");
    });
});
