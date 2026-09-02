pub trait OnInit {
    fn on_init(&self);
}

pub trait OnChanges {
    fn on_changes(&self);
}

pub trait OnDestroy {
    fn on_destroy(&self);
}
