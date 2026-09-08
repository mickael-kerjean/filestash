use filestash::*;

#[derive(Default)]
pub struct Page;

impl Http for Page {
    fn routes(r: &mut Router<Self>) {
        r.get("/api/example", &["index_headers"], Page::index);
    }
}

impl Page {
    fn index(&self, _ctx: &impl Context, _req: &impl Request, res: &mut impl Response) {
        res.header("Content-Type", "text/html");
        res.write(b"<h1>Hello from a Filestash plugin</h1>");
    }
}

register!(Page: Http);
