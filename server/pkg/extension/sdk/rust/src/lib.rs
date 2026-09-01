mod app;
pub mod authorisation;
mod context;
mod ffi;
mod http;
pub mod logger;
mod middleware;
mod request;
mod response;

pub use app::App;
pub use authorisation::{Authorisation, Decision};
pub use context::Context;
pub use http::{Handler, Http, Router};
pub use middleware::{Middleware, Next};
pub use request::Request;
pub use response::Response;

pub use log;

pub(crate) fn read(call: impl Fn(*mut u8, u32) -> u32) -> String {
    let mut buf = vec![0u8; 4096];
    let n = call(buf.as_mut_ptr(), buf.len() as u32) as usize;
    buf.truncate(n);
    String::from_utf8_lossy(&buf).into_owned()
}
