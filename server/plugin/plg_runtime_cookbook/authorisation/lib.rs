use filestash::*;

#[derive(Default)]
pub struct Plugin;

impl Authorisation for Plugin {
    fn ls(&self, _ctx: &Context, path: &str) -> Decision {
        self.check(path)
    }
    fn cat(&self, _ctx: &Context, path: &str) -> Decision {
        self.check(path)
    }
    fn stat(&self, _ctx: &Context, path: &str) -> Decision {
        self.check(path)
    }
}

impl Plugin {
    fn check(&self, path: &str) -> Decision {
        if path.split("/").any(|segment| segment == "top_secret") {
            log::warn!("[TOPSECRET] access denied !!");
            return Decision::Deny;
        }
        Decision::Allow
    }
}

register!(Plugin: Authorisation);
