use crate::ffi;

pub struct Response;

impl Response {
    pub fn status(&mut self, code: u16) -> &mut Self {
        unsafe { ffi::resp_status(code as u32) };
        self
    }

    pub fn header(&mut self, key: &str, value: &str) -> &mut Self {
        unsafe {
            ffi::resp_header(key.as_ptr(), key.len() as u32, value.as_ptr(), value.len() as u32)
        };
        self
    }

    pub fn write(&mut self, data: &[u8]) -> &mut Self {
        unsafe { ffi::resp_write(data.as_ptr(), data.len() as u32) };
        self
    }
}
