use crate::{Request, Response};

#[link(wasm_import_module = "env")]
extern "C" {
    fn ffi_http_push_route(
        method: *const u8,
        method_len: u32,
        path: *const u8,
        path_len: u32,
        middleware: *const u8,
        middleware_len: u32,
    );
}

pub type Handler<A> = fn(&A, &Request, &mut Response);

struct Route<A> {
    method: &'static str,
    path: &'static str,
    middleware: &'static [&'static str],
    handler: Handler<A>,
}

pub struct Router<A> {
    routes: Vec<Route<A>>,
}

impl<A> Router<A> {
    pub fn new() -> Self {
        Router { routes: Vec::new() }
    }

    pub fn get(&mut self, path: &'static str, middleware: &'static [&'static str], handler: Handler<A>) -> &mut Self {
        self.route("GET", path, middleware, handler)
    }

    pub fn put(&mut self, path: &'static str, middleware: &'static [&'static str], handler: Handler<A>) -> &mut Self {
        self.route("PUT", path, middleware, handler)
    }

    pub fn dispatch(&self, app: &A, method: &str, path: &str, req: &Request, res: &mut Response) {
        for route in &self.routes {
            if route.method == method && route.path == path {
                (route.handler)(app, req, res);
                return;
            }
        }
        res.status(404);
    }

    pub fn describe(&self) {
        for route in &self.routes {
            let middleware = route.middleware.join(",");
            unsafe {
                ffi_http_push_route(
                    route.method.as_ptr(),
                    route.method.len() as u32,
                    route.path.as_ptr(),
                    route.path.len() as u32,
                    middleware.as_ptr(),
                    middleware.len() as u32,
                );
            }
        }
    }

    fn route(&mut self, method: &'static str, path: &'static str, middleware: &'static [&'static str], handler: Handler<A>) -> &mut Self {
        self.routes.push(Route { method, path, middleware, handler });
        self
    }
}

pub trait Http {
    fn routes(router: &mut Router<Self>)
    where
        Self: Sized;
}
