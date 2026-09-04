use crate::{RequestImpl, Response, ResponseImpl, ContextImpl};

#[link(wasm_import_module = "env")]
extern "C" {
    fn ffi_http_push_route(
        route: *const u8,
        route_len: u32,
        middleware: *const u8,
        middleware_len: u32,
    );
}

pub type Handler<A> = fn(&A, &ContextImpl, &RequestImpl, &mut ResponseImpl);

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

    pub fn head(&mut self, path: &'static str, middleware: &'static [&'static str], handler: Handler<A>) -> &mut Self {
        self.route("HEAD", path, middleware, handler)
    }

    pub fn get(&mut self, path: &'static str, middleware: &'static [&'static str], handler: Handler<A>) -> &mut Self {
        self.route("GET", path, middleware, handler)
    }

    pub fn put(&mut self, path: &'static str, middleware: &'static [&'static str], handler: Handler<A>) -> &mut Self {
        self.route("PUT", path, middleware, handler)
    }

    pub fn post(&mut self, path: &'static str, middleware: &'static [&'static str], handler: Handler<A>) -> &mut Self {
        self.route("POST", path, middleware, handler)
    }

    pub fn delete(&mut self, path: &'static str, middleware: &'static [&'static str], handler: Handler<A>) -> &mut Self {
        self.route("DELETE", path, middleware, handler)
    }

    pub fn patch(&mut self, path: &'static str, middleware: &'static [&'static str], handler: Handler<A>) -> &mut Self {
        self.route("PATCH", path, middleware, handler)
    }

    pub fn dispatch(&self, app: &A, method: &str, path: &str, req: &RequestImpl, res: &mut ResponseImpl) {
        for route in &self.routes {
            if route.method == method && route.path == path {
                (route.handler)(app, &ContextImpl{}, req, res);
                return;
            }
        }
        res.status(404);
        res.write(b"{\"status\": \"error\", \"message\": \"not_found\"}");
    }

    pub fn describe(&self) {
        for route in &self.routes {
            let line = format!("{} {}", route.method, route.path);
            let middleware = route.middleware.join(",");
            unsafe {
                ffi_http_push_route(
                    line.as_ptr(),
                    line.len() as u32,
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
