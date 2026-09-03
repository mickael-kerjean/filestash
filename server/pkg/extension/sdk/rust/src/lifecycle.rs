pub trait Lifecycle {
    fn on_init(&self) {}

    fn on_changes(&self) {}

    fn on_destroy(&self) {}
}

pub trait OnInit {
    fn on_init(&self);
}

impl<T: Lifecycle> OnInit for T {
    fn on_init(&self) {
        Lifecycle::on_init(self)
    }
}

pub trait OnChanges {
    fn on_changes(&self);
}

impl<T: Lifecycle> OnChanges for T {
    fn on_changes(&self) {
        Lifecycle::on_changes(self)
    }
}

pub trait OnDestroy {
    fn on_destroy(&self);
}

impl<T: Lifecycle> OnDestroy for T {
    fn on_destroy(&self) {
        Lifecycle::on_destroy(self)
    }
}
