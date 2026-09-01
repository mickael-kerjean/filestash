use crate::{Request, Response};

#[link(wasm_import_module = "env")]
extern "C" {
    fn ffi_middleware_push_next();
}

pub enum Next {
    Continue,
    Stop,
}

impl Next {
    pub fn apply(self) {
        if let Next::Continue = self {
            unsafe { ffi_middleware_push_next() };
        }
    }
}

pub trait Middleware {
    fn handle(&self, req: &Request, res: &mut Response) -> Next;
}
