use filestash::*;

pub struct Plugin;

impl App for Plugin {
    fn new() -> Self {
        Plugin
    }
}

impl OnInit for Plugin {
    fn on_init(&self) {
        log::info!("[runtime::plugin::oninit] server is ready");
    }
}

register!(Plugin: OnInit);
