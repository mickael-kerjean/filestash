use filestash::*;

#[derive(Default)]
pub struct Page;

impl Http for Page {
    fn routes(r: &mut Router<Self>) {
        r.get("/api/example", &["index_headers"], Page::index);
    }
}

impl Page {
    fn index(&self, _req: &Request, res: &mut Response) {
        res.header("Content-Type", "text/html; charset=utf-8")
            .status(200)
            .write(b"<!DOCTYPE html><h1>Hello from a Filestash plugin</h1>");
    }
}

register!(Page: Http);
