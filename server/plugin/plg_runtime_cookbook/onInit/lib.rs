use filestash::*;

#[derive(Default)]
pub struct Plugin;

impl OnInit for Plugin {
    fn on_init(&self) {
        log::info!("[runtime::plugin::oninit] server is ready");
    }
}

register!(Plugin: OnInit);
