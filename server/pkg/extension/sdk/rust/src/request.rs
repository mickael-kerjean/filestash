use crate::{ffi, read};

pub struct Request;

impl Request {
    pub fn method(&self) -> String {
        read(|ptr, cap| unsafe { ffi::req_method(ptr, cap) })
    }

    pub fn path(&self) -> String {
        read(|ptr, cap| unsafe { ffi::req_path(ptr, cap) })
    }

    pub fn header(&self, name: &str) -> String {
        read(|ptr, cap| unsafe { ffi::req_header(name.as_ptr(), name.len() as u32, ptr, cap) })
    }
}
