use filestash::*;

#[derive(Default)]
pub struct Plugin;

impl Lifecycle for Plugin {
    fn on_changes(&self) {
        log::info!("[runtime::plugin::onchange] config has changed");
    }
}

register!(Plugin: OnChanges);
