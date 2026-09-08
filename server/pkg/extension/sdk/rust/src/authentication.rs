use crate::{read, Form, Request, Response, Error};

use std::collections::HashMap;

#[link(wasm_import_module = "env")]
extern "C" {
    fn ffi_authentication_push_setup(ptr: *const u8, len: u32);
    fn ffi_authentication_pull_idp(out_ptr: *mut u8, out_cap: u32) -> u32;
    fn ffi_authentication_pull_form(out_ptr: *mut u8, out_cap: u32) -> u32;
    fn ffi_authentication_push_session(ptr: *const u8, len: u32);
    fn ffi_authentication_push_error(ptr: *const u8, len: u32);
}

pub fn authentication_push_setup(forms: &[Form]) {
    let json = serde_json::to_string(forms).unwrap_or_else(|_| String::from("[]"));
    unsafe { ffi_authentication_push_setup(json.as_ptr(), json.len() as u32) };
}

pub fn authentication_pull_idp() -> HashMap<String, String> {
    serde_json::from_str(&read(|ptr, cap| unsafe { ffi_authentication_pull_idp(ptr, cap) }))
        .unwrap_or_default()
}

pub fn authentication_pull_form() -> HashMap<String, String> {
    serde_json::from_str(&read(|ptr, cap| unsafe { ffi_authentication_pull_form(ptr, cap) }))
        .unwrap_or_default()
}

pub fn authentication_push_session(session: &HashMap<String, String>) {
    let json = serde_json::to_string(session).unwrap_or_else(|_| String::from("{}"));
    unsafe { ffi_authentication_push_session(json.as_ptr(), json.len() as u32) };
}

pub fn authentication_push_error(err: &Error) {
    let Error::Message(msg) = err;
    unsafe { ffi_authentication_push_error(msg.as_ptr(), msg.len() as u32) };
}

pub trait Authentication {
    fn setup() -> Vec<Form>;
    fn entrypoint(idp: HashMap<String, String>, req: &impl Request, resp: &mut impl Response) -> Result<(), Error>;
    fn callback(form: HashMap<String, String>, idp: HashMap<String, String>, resp: &mut impl Response) -> Result<HashMap<String, String>, Error>;
}
