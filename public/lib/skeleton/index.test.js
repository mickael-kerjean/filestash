import main, { createElement, onDestroy } from "./index.js";

xdescribe("router with inline controller", () => {
    it("can render a string", async() => {
        // given
        const $app = window.document.createElement("div");
        const routes = {
            "/": (render) => render("<h1 id=\"test\">main</h1>")
        };

        // when
        main($app, routes);
        window.dispatchEvent(new window.Event("pagechange"));

        await nextTick();
        expect($app.querySelector("#test").textContent).toBe("main");
    });

    it("can render a dom node", async() => {
        // given
        const $app = window.document.createElement("div");
        const $node = createElement("<h1 id=\"test\">main</h1>");
        const routes = {
            "/": (render) => render($node)
        };

        // when
        main($app, routes);
        window.dispatchEvent(new window.Event("pagechange"));

        // then
        await nextTick();
        expect($node instanceof window.Element).toBe(true);
        expect($app.querySelector("#test").textContent).toBe("main");
    });

    it("errors when given a non valid route", async() => {
        // given
        const $app = window.document.createElement("div");
        const $node = createElement("<h1 id=\"test\">main</h1>");
        const routes = {
            "/": null
        };

        // when
        main($app, routes);
        window.dispatchEvent(new window.Event("pagechange"));

        // then
        await nextTick();
        expect($node instanceof window.Element).toBe(true);
        expect($app.querySelector("h1").textContent).toBe("Error");
    });

    it("errors when given a non valid render", async() => {
        // given
        const $app = window.document.createElement("div");
        const $node = createElement("<h1 id=\"test\">main</h1>");
        const routes = {
            "/": (render) => render({ json: "object", is: "not_ok" })
        };

        // when
        main($app, routes);
        window.dispatchEvent(new window.Event("pagechange"));

        // then
        await nextTick();
        expect($node instanceof window.Element).toBe(true);
        expect($app.querySelector("h1").textContent).toBe("Error");
    });
});

xdescribe("router with es6 module as a controller", () => {
    it("render the default import", async() => {
        // given
        const $app = window.document.createElement("div");
        const routes = {
            "/": "./common/skeleton/test/ctrl/ok.js"
        };

        // when
        main($app, routes);
        window.dispatchEvent(new window.Event("pagechange"));

        // then
        await nextTick();
        expect($app.querySelector("h1").textContent.trim()).toBe("hello world");
    });

    it("error when missing the default render", async() => {
        // given
        const $app = window.document.createElement("div");
        const routes = {
            "/": "./common/skeleton/test/ctrl/nok.js"
        };

        // when
        main($app, routes);
        window.dispatchEvent(new window.Event("pagechange"));

        // then
        await nextTick();
        expect($app.querySelector("h1").textContent.trim()).toBe("Error");
    });
});

xdescribe("navigation", () => {
    it("using a link with data-link attribute for SPA", async() => {
        // given
        const $app = window.document.createElement("div");
        const routes = {
            "/": "./common/skeleton/test/ctrl/link.js",
            "/something": (render) => render("<h1>OK</h1>")
        };
        const destroy = jest.fn();

        // when
        main($app, routes);
        window.dispatchEvent(new window.Event("pagechange"));
        await nextTick();
        expect(window.location.pathname).toBe("/");
        onDestroy(destroy);
        $app.querySelector("#spa-link").click();
        await nextTick();

        // then
        expect(destroy).toHaveBeenCalled();
        expect(window.location.pathname).toBe("/something");
    });
});
