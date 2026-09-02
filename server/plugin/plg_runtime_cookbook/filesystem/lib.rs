use filestash::*;
use std::fs::OpenOptions;
use std::io::Write;

#[derive(Default)]
pub struct Plugin;

impl OnInit for Plugin {
    fn on_init(&self) {
        append("the server has started\n");
    }
}

impl OnDestroy for Plugin {
    fn on_destroy(&self) {
        append("the server has stopped\n");
    }
}

fn append(line: &str) {
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open("/{{ .TMP_PATH }}/example.log")
        .unwrap();
    file.write_all(line.as_bytes()).unwrap();
    log::info!("[runtime::plugin::filesystem] appended to example.log: {}", line.trim());
}

register!(Plugin: OnInit + OnDestroy);
