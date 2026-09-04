use crate::ffi;

#[derive(Default)]
pub struct ResponseImpl;

#[cfg_attr(feature = "mock", mockall::automock)]
pub trait Response {
    fn status(&mut self, code: u16);
    fn header(&mut self, key: &str, value: &str);
    fn write(&mut self, data: &[u8]);
}

impl Response for ResponseImpl {
    fn status(&mut self, code: u16) {
        unsafe { ffi::resp_status(code as u32) };
    }

    fn header(&mut self, key: &str, value: &str) {
        unsafe {
            ffi::resp_header(key.as_ptr(), key.len() as u32, value.as_ptr(), value.len() as u32)
        };
    }

    fn write(&mut self, data: &[u8]) {
        unsafe { ffi::resp_write(data.as_ptr(), data.len() as u32) };
    }
}
