import home from "./index.js";

test("home", () => {
    const render = jest.fn();
    home(render);
    expect(render).toBeCalledTimes(1);
});
