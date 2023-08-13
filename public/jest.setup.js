import { jest } from "@jest/globals";
import { JSDOM } from "jsdom";

global.jest = jest;
global.window = new JSDOM("<html></html>", { url: "http://example.com" }).window;
global.document = global.window.document;
global.nextTick = () => new Promise((done) => process.nextTick(done));
global.location = global.window.location;
global.createRender = function () {
    const fn = jest.fn();
    fn.get = (i = 0) => fn.mock.calls[i][0]
    fn.size = () => fn.mock.calls.length;
    return fn;
}
global.console = {
    ...console,
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
