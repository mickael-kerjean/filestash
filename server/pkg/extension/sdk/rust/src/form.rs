use serde::Serialize;

#[derive(Default, Serialize)]
pub struct Form {
    pub label: String,
    pub kind: String,
    pub value: Option<String>,
}
