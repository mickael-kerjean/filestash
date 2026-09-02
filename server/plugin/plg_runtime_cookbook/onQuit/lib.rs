use filestash::*;

pub struct Plugin;

impl App for Plugin {
    fn new() -> Self {
        Plugin
    }
}

impl OnDestroy for Plugin {
    fn on_destroy(&self) {
        log::info!("[runtime::plugin::onquit] server is shutting down");
    }
}

register!(Plugin: OnDestroy);
