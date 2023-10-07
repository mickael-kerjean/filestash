import { createElement } from "./index.js";
import { currentRoute, init } from "./router.js";
import * as routerModule from "./router.js";

describe("router", () => {
    xit("logic to get the current route", () => {
        // given
        let res;
        const routes = {
            "/foo": "route /foo",
            "/bar": "route /bar"
        };
        window.location.pathname = "/";

        // when, then
        expect(window.location.pathname).toBe("/");
        expect(currentRoute({ "/": "route /", ...routes })).toBe("route /");
        expect(currentRoute(routes, "/foo")).toBe("route /foo");
        expect(currentRoute(routes)).toBe(null);
    });

    it("trigger a page change when DOMContentLoaded", () => {
        // given
        const fn = jest.fn();
        init(createElement("<div></div>"));
        window.addEventListener("pagechange", fn);

        // when
        window.dispatchEvent(new window.Event("DOMContentLoaded"));

        // then
        expect(fn).toBeCalled();
    });
    it("trigger a page change when history back", () => {
        // given
        const fn = jest.fn();
        init(createElement("<div></div>"));
        window.addEventListener("pagechange", fn);

        // when
        window.dispatchEvent(new window.Event("popstate"));

        // then
        expect(fn).toBeCalled();
    });
    xit("trigger a page change when clicking on a link with [data-link] attribute", () => {
        // given
        const fn = jest.fn();
        const $link = createElement("<a href=\"/something\" data-link></a>");
        init($link);
        window.addEventListener("pagechange", fn);

        // when
        $link.click();

        // then
        expect(fn).toBeCalled();
    });
    it("trigger a page change when clicking on a link with [data-link] attribute - recursive", () => {
        // given
        const fn = jest.fn();
        const $link = createElement("<a href=\"/something\" data-link><div id=\"click-here\">test</div></a>");
        init($link);
        window.addEventListener("pagechange", fn);

        // when
        $link.querySelector("#click-here").click();

        // then
        expect(fn).toBeCalled();
    });

    it("does nothing when clicking not on a link", () => {
        // given
        const fn = jest.fn();
        const $app = createElement(`<div>
            <div id="click-here">test</div>
            <a href="/something" data-link></a>
        </div>`);
        init($app);
        window.addEventListener("pagechange", fn);

        // when
        $app.querySelector("#click-here").click();

        // then
        expect(fn).not.toBeCalled();
    });
});
