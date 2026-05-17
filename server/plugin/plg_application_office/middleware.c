//go:build ignorep
__attribute__((import_module("env"), import_name("middleware_next")))
extern void host_middleware_next(void);

__attribute__((import_module("env"), import_name("resp_header")))
extern void host_resp_header(const char* k, unsigned int klen, const char* v, unsigned int vlen);

#define SET_HEADER(k, v) host_resp_header(k, sizeof(k) - 1, v, sizeof(v) - 1)

__attribute__((export_name("middleware")))
void middleware(void) {
    SET_HEADER("Cross-Origin-Opener-Policy",   "same-origin");
    SET_HEADER("Cross-Origin-Embedder-Policy", "require-corp");
    host_middleware_next();
}
