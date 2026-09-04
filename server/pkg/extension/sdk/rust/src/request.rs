use crate::{ffi, read};

#[derive(Default)]
pub struct RequestImpl;

#[cfg_attr(feature = "mock", mockall::automock)]
pub trait Request {
    fn method(&self) -> String;
    fn path(&self) -> String;
    fn header(&self, name: &str) -> String;
    fn url_query(&self, key: &str) -> Option<String>;
}

impl Request for RequestImpl {
    fn method(&self) -> String {
        read(|ptr, cap| unsafe { ffi::req_method(ptr, cap) })
    }

    fn path(&self) -> String {
        read(|ptr, cap| unsafe { ffi::req_path(ptr, cap) })
    }

    fn header(&self, name: &str) -> String {
        read(|ptr, cap| unsafe { ffi::req_header(name.as_ptr(), name.len() as u32, ptr, cap) })
    }

    fn url_query(&self, key: &str) -> Option<String> {
        let value = read(|ptr, cap| unsafe { ffi::req_url_query(key.as_ptr(), key.len() as u32, ptr, cap) });
        if value.is_empty() {
            return None
        }
        return Some(value)
    }
}
