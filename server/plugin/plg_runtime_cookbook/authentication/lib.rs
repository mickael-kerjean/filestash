use filestash::*;
use std::collections::HashMap;


#[derive(Default)]
pub struct Plugin;

impl Authentication for Plugin {
    fn setup() -> Vec<Form> {
        vec![
            Form {
                label: String::from("type"),
                kind: String::from("hidden"),
                value: Some(String::from("test")),
            },
            Form {
                label: String::from("banner"),
                kind: String::from("text"),
                value: Some(String::from("An authentication plugin that always say yes")),
            },
        ]
    }
    fn entrypoint(_idp: HashMap<String, String>, _req: &impl Request, res: &mut impl Response) -> Result<(), Error> {
        res.header("Content-Type", "text/html");
        res.write(b"<form method=\"post\"><button>CONNECT</button></form>");
        Ok(())
    }
    fn callback(_form: HashMap<String, String>, _idp: HashMap<String, String>, _resp: &mut impl Response) -> Result<HashMap<String, String>, Error> {
        let mut h = HashMap::new();
        h.insert("username".to_string(), "anonymous".to_string());
        Ok(h)
    }
}

register!(Plugin: Authentication);
