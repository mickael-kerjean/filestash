use filestash::*;

pub struct Plugin;

impl App for Plugin {
    fn new() -> Self {
        Plugin
    }
}

impl OnChanges for Plugin {
    fn on_changes(&self) {
        log::info!("[runtime::plugin::onchange] config has changed");
    }
}

register!(Plugin: OnChanges);
