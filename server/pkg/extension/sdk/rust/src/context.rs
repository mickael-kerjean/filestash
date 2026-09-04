use crate::{read, ffi};

#[derive(Default)]
pub struct ContextImpl;

#[cfg_attr(feature = "mock", mockall::automock)]
pub trait Context {
    fn body(&self) -> Vec<u8>;
    fn session(&self) -> Vec<u8>;
}

impl Context for ContextImpl {
    fn body(&self) -> Vec<u8> {
        read(|ptr, cap| unsafe { ffi::app_body(ptr, cap) }).into_bytes()
    }

    fn session(&self) -> Vec<u8> {
        read(|ptr, cap| unsafe { ffi::app_session(ptr, cap) }).into_bytes()
    }
}
