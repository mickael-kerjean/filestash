import exec from "./ctrl_boot_backoffice.js";

describe("ctrl::boot", () => {
    it("runs", async() => {
        const start = new Date();
        await exec();
        expect(new Date() - start).toBeLessThan(100);
    });
});
