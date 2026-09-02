#[macro_export]
macro_rules! register {
    ($app:ident : $head:ident $(+ $rest:ident)*) => {
        ::std::thread_local! {
            static APP: $app = <$app as ::std::default::Default>::default();
        }

        #[no_mangle]
        pub extern "C" fn init() {
            $crate::logger::init();
            APP.with(|_| {});
        }

        $crate::register!(@capability APP, $app, $head);
        $( $crate::register!(@capability APP, $app, $rest); )*
    };

    (@capability $anchor:ident, $app:ident, Authorisation) => {
        #[no_mangle]
        pub extern "C" fn capability_authorisation() {}
        #[no_mangle]
        pub extern "C" fn authorisation_ls() {
            let path = $crate::authorisation::authorisation_pull_path();
            $anchor.with(|app| <$app as $crate::Authorisation>::ls(app, &$crate::Context, &path)).apply();
        }
        #[no_mangle]
        pub extern "C" fn authorisation_cat() {
            let path = $crate::authorisation::authorisation_pull_path();
            $anchor.with(|app| <$app as $crate::Authorisation>::cat(app, &$crate::Context, &path)).apply();
        }
        #[no_mangle]
        pub extern "C" fn authorisation_stat() {
            let path = $crate::authorisation::authorisation_pull_path();
            $anchor.with(|app| <$app as $crate::Authorisation>::stat(app, &$crate::Context, &path)).apply();
        }
        #[no_mangle]
        pub extern "C" fn authorisation_mkdir() {
            let path = $crate::authorisation::authorisation_pull_path();
            $anchor.with(|app| <$app as $crate::Authorisation>::mkdir(app, &$crate::Context, &path)).apply();
        }
        #[no_mangle]
        pub extern "C" fn authorisation_rm() {
            let path = $crate::authorisation::authorisation_pull_path();
            $anchor.with(|app| <$app as $crate::Authorisation>::rm(app, &$crate::Context, &path)).apply();
        }
        #[no_mangle]
        pub extern "C" fn authorisation_mv() {
            let from = $crate::authorisation::authorisation_pull_path();
            let to = $crate::authorisation::authorisation_pull_target();
            $anchor.with(|app| <$app as $crate::Authorisation>::mv(app, &$crate::Context, &from, &to)).apply();
        }
        #[no_mangle]
        pub extern "C" fn authorisation_save() {
            let path = $crate::authorisation::authorisation_pull_path();
            $anchor.with(|app| <$app as $crate::Authorisation>::save(app, &$crate::Context, &path)).apply();
        }
        #[no_mangle]
        pub extern "C" fn authorisation_touch() {
            let path = $crate::authorisation::authorisation_pull_path();
            $anchor.with(|app| <$app as $crate::Authorisation>::touch(app, &$crate::Context, &path)).apply();
        }
    };

    (@capability $anchor:ident, $app:ident, Http) => {
        #[no_mangle]
        pub extern "C" fn capability_http() {}
        #[no_mangle]
        pub extern "C" fn http_describe() {
            let mut router = $crate::Router::new();
            <$app as $crate::Http>::routes(&mut router);
            router.describe();
        }
        #[no_mangle]
        pub extern "C" fn http() {
            let method = $crate::Request.method();
            let path = $crate::Request.path();
            let mut router = $crate::Router::new();
            <$app as $crate::Http>::routes(&mut router);
            let mut res = $crate::Response;
            $anchor.with(|app| router.dispatch(app, &method, &path, &$crate::Request, &mut res));
        }
    };

    (@capability $anchor:ident, $app:ident, OnInit) => {
        #[no_mangle]
        pub extern "C" fn capability_on_init() {}
        #[no_mangle]
        pub extern "C" fn on_init() {
            $anchor.with(|app| <$app as $crate::OnInit>::on_init(app));
        }
    };

    (@capability $anchor:ident, $app:ident, OnChanges) => {
        #[no_mangle]
        pub extern "C" fn capability_on_changes() {}
        #[no_mangle]
        pub extern "C" fn on_changes() {
            $anchor.with(|app| <$app as $crate::OnChanges>::on_changes(app));
        }
    };

    (@capability $anchor:ident, $app:ident, OnDestroy) => {
        #[no_mangle]
        pub extern "C" fn capability_on_destroy() {}
        #[no_mangle]
        pub extern "C" fn on_destroy() {
            $anchor.with(|app| <$app as $crate::OnDestroy>::on_destroy(app));
        }
    };

    (@capability $anchor:ident, $app:ident, Middleware) => {
        #[no_mangle]
        pub extern "C" fn capability_middleware() {}
        #[no_mangle]
        pub extern "C" fn middleware() {
            let mut res = $crate::Response;
            $anchor
                .with(|app| <$app as $crate::Middleware>::handle(app, &$crate::Request, &mut res))
                .apply();
        }
    };

}
