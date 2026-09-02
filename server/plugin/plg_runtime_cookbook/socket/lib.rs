use filestash::*;

#[derive(Default)]
pub struct Plugin;

impl OnInit for Plugin {
    fn on_init(&self) {
        match ureq::get("https://demo.filestash.app/healthz").call() {
            Ok(mut r) => match r.body_mut().read_to_string() {
                Ok(body) => log::info!("[runtime::plugin::socket] healthz {}", body),
                Err(e) => log::error!("[runtime::plugin::socket] healthz {}", e),
            },
            Err(e) => log::error!("[runtime::plugin::socket] healthz {}", e),
        }
    }
}

register!(Plugin: OnInit);
