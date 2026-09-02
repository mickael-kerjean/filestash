use crate::ffi;

struct Logger;

impl log::Log for Logger {
    fn enabled(&self, _metadata: &log::Metadata) -> bool {
        true
    }

    fn log(&self, record: &log::Record) {
        let msg = format!("{}", record.args());
        unsafe { ffi::log(record.level() as u32, msg.as_ptr(), msg.len() as u32) };
    }

    fn flush(&self) {}
}

static LOGGER: Logger = Logger;

pub fn init() {
    let _ = log::set_logger(&LOGGER);
    log::set_max_level(log::LevelFilter::Info);
}
