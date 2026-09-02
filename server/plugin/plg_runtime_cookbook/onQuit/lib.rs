use filestash::*;

#[derive(Default)]
pub struct Plugin;

impl OnDestroy for Plugin {
    fn on_destroy(&self) {
        log::info!("[runtime::plugin::onquit] server is shutting down");
    }
}

register!(Plugin: OnDestroy);
