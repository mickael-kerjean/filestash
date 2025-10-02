const routes = {
    "/admin/storage": "/pages/adminpage/ctrl_storage.js",
    "/admin/workflow.*": "/pages/adminpage/ctrl_workflow.js",
    "/admin/activity": "/pages/adminpage/ctrl_activity.js",
    "/admin/settings": "/pages/adminpage/ctrl_settings.js",
    "/admin/about": "/pages/adminpage/ctrl_about.js",
    "/admin/setup": "/pages/adminpage/ctrl_setup.js",
    "/admin/": "/pages/ctrl_adminpage.js",
    "/admin": "/pages/ctrl_adminpage.js",
    "/logout": "/pages/ctrl_logout.js",
    "": "/pages/ctrl_notfound.js",
};

export default routes;
