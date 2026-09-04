mod app;
pub mod authorisation;
mod context;
mod ffi;
mod http;
mod lifecycle;
pub mod logger;
mod middleware;
mod request;
mod response;

pub use authorisation::{Authorisation, Decision};
pub use http::{Handler, Http, Router};
pub use lifecycle::{Lifecycle, OnChanges, OnDestroy, OnInit};
pub use middleware::{Middleware, Next};
pub use request::{Request, RequestImpl};
pub use response::{Response, ResponseImpl};
pub use context::{Context, ContextImpl};

pub use log;

pub(crate) fn read(call: impl Fn(*mut u8, u32) -> u32) -> String {
    let mut buf = vec![0u8; 4096];
    let n = call(buf.as_mut_ptr(), buf.len() as u32) as usize;
    buf.truncate(n);
    String::from_utf8_lossy(&buf).into_owned()
}

#[cfg(feature = "mock")]
pub use request::MockRequest;
#[cfg(feature = "mock")]
pub use response::MockResponse;
#[cfg(feature = "mock")]
pub use context::MockContext;
