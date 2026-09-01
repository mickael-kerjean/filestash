use crate::{read, Context};

#[link(wasm_import_module = "env")]
extern "C" {
    fn ffi_authorisation_pull_path(out_ptr: *mut u8, out_cap: u32) -> u32;
    fn ffi_authorisation_pull_target(out_ptr: *mut u8, out_cap: u32) -> u32;
    fn ffi_authorisation_push_allow();
}

pub fn authorisation_pull_path() -> String {
    read(|ptr, cap| unsafe { ffi_authorisation_pull_path(ptr, cap) })
}

pub fn authorisation_pull_target() -> String {
    read(|ptr, cap| unsafe { ffi_authorisation_pull_target(ptr, cap) })
}

pub enum Decision {
    Allow,
    Deny,
}

impl Decision {
    pub fn apply(self) {
        if let Decision::Allow = self {
            unsafe { ffi_authorisation_push_allow() };
        }
    }
}

pub trait Authorisation {
    fn ls(&self, _ctx: &Context, _path: &str) -> Decision {
        Decision::Deny
    }
    fn cat(&self, _ctx: &Context, _path: &str) -> Decision {
        Decision::Deny
    }
    fn stat(&self, _ctx: &Context, _path: &str) -> Decision {
        Decision::Deny
    }
    fn mkdir(&self, _ctx: &Context, _path: &str) -> Decision {
        Decision::Deny
    }
    fn rm(&self, _ctx: &Context, _path: &str) -> Decision {
        Decision::Deny
    }
    fn mv(&self, _ctx: &Context, _from: &str, _to: &str) -> Decision {
        Decision::Deny
    }
    fn save(&self, _ctx: &Context, _path: &str) -> Decision {
        Decision::Deny
    }
    fn touch(&self, _ctx: &Context, _path: &str) -> Decision {
        Decision::Deny
    }
}
