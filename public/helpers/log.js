export function report(msg, error, link, lineNo, columnNo) {
    if (navigator.onLine === false) return Promise.resolve();
    let url = "/report?";
    url += "url="+encodeURIComponent(location.href)+"&";
    url += "msg="+encodeURIComponent(msg)+"&";
    url += "from="+encodeURIComponent(link)+"&";
    url += "from.lineNo="+lineNo+"&";
    url += "from.columnNo="+columnNo;
    if (error) url += "error="+encodeURIComponent(error.message)+"&";

    return fetch(url, { method: "post" }).catch(() => {});
}
