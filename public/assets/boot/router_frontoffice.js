const routes = {
    "/login": "/pages/ctrl_connectpage.js",
    "/logout": "/pages/ctrl_logout.js",

    "/": "/pages/ctrl_homepage.js",
    "/files/.*": "/pages/ctrl_filespage.js",
    "/view/.*": "/pages/ctrl_viewerpage.js",
    // /tags/.* -> "pages/ctrl_tags.js",
    "/s/.*": "/pages/ctrl_sharepage.js",

    "": "/pages/ctrl_notfound.js",
};

export default routes;
