use serde::Serialize;

#[derive(Default, Serialize)]
pub struct Form {
    pub label: String,
    #[serde(rename = "type")] pub kind: String,
    pub value: Option<String>,
}
