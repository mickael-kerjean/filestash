//go:build ignore
__attribute__((export_name("middleware")))
const unsigned char* middleware(void) {
    return (const unsigned char*)
        "HTTP/1.0 204 OK\r\n"
        "Cross-Origin-Opener-Policy: same-origin\r\n"
        "Cross-Origin-Embedder-Policy: require-corp\r\n"
        "\r\n"
        "\0";
}
