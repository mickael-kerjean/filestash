// import loaderDBase from "./loader_dbase.js";
// import loaderSymbol from "./loader_symbol.js";

class ITable {
    contructor() {}
    getHeader() { throw new Error("NOT_IMPLEMENTED"); }
    getBody() { throw new Error("NOT_IMPLEMENTED"); }
}

export async function getLoader(mime) {
    let module = null;
    switch (mime) {
    case "application/dbf":
        module = await import("./loader_dbase.js");
        break;
    case "application/x-archive":
        module = await import("./loader_symbol.js");
        break;
    default:
        throw new TypeError(`unsupported mimetype '${mime}'`);
    }

    return module.default(ITable);
}
