const routes = {
    "/login": "/pages/ctrl_connectpage.js",
    "/logout": "/pages/ctrl_logout.js",

    "/": "/pages/ctrl_homepage.js",
    "/files/.*": "/pages/ctrl_filespage.js",
    "/view/.*": "/pages/ctrl_viewerpage.js",
    // /tags/.* -> "pages/ctrl_tags.js",
    // /s/.* -> "/pages/ctrl_share.js",

    "/admin/backend": "/pages/adminpage/ctrl_backend.js",
    "/admin/settings": "/pages/adminpage/ctrl_settings.js",
    "/admin/logs": "/pages/adminpage/ctrl_logger.js",
    "/admin/about": "/pages/adminpage/ctrl_about.js",
    "/admin/setup": "/pages/adminpage/ctrl_setup.js",
    "/admin/": "/pages/ctrl_adminpage.js",

    "": "/pages/ctrl_notfound.js",
};

export default routes;
