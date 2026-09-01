#[link(wasm_import_module = "env")]
extern "C" {
    pub fn req_method(out_ptr: *mut u8, out_cap: u32) -> u32;
    pub fn req_path(out_ptr: *mut u8, out_cap: u32) -> u32;
    pub fn req_header(name_ptr: *const u8, name_len: u32, out_ptr: *mut u8, out_cap: u32) -> u32;

    pub fn resp_status(code: u32);
    pub fn resp_header(key: *const u8, key_len: u32, value: *const u8, value_len: u32);
    pub fn resp_write(ptr: *const u8, len: u32);

    pub fn log(level: u32, ptr: *const u8, len: u32);
}
