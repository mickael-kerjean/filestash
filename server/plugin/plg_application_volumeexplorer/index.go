package plg_application_volumeexplorer

import (
    "fmt"
    "io"
    "net/http"
    "os"
    "strconv"
    "strings"

    . "github.com/mickael-kerjean/filestash/server/common"
    ctrl "github.com/mickael-kerjean/filestash/server/ctrl"
    . "github.com/mickael-kerjean/filestash/server/middleware"
    "github.com/mickael-kerjean/filestash/server/model"

    "github.com/gorilla/mux"
)

var volumeExplorerCache = NewAppCache(60, 10)

func init() {
    volumeExplorerCache.OnEvict(func(_ string, value interface{}) {
        if path, ok := value.(string); ok {
            _ = os.Remove(path)
        }
    })

    Hooks.Register.HttpEndpoint(func(r *mux.Router) error {
        r.HandleFunc("/api/plg_application_volumeexplorer/cat", NewMiddlewareChain(
            fileCatProxy,
            []Middleware{ApiHeaders, SecureHeaders, SessionStart, LoggedInOnly},
        )).Methods("GET", "HEAD")
        return nil
    })
}

func fileCatProxy(ctx *App, res http.ResponseWriter, req *http.Request) {
    Log.Info(
        "plg_application_volumeexplorer::cat method=%s path=%s range=%q",
        req.Method,
        req.URL.Query().Get("path"),
        req.Header.Get("Range"),
    )

    if req.Header.Get("Range") == "" {
        ctrl.FileCat(ctx, res, req)
        return
    }

    http.SetCookie(res, &http.Cookie{
        Name:   "download",
        Value:  "",
        MaxAge: -1,
        Path:   "/",
    })

    if model.CanRead(ctx) == false {
        SendErrorResult(res, ErrPermissionDenied)
        return
    }

    path, err := ctrl.PathBuilder(ctx, req.URL.Query().Get("path"))
    if err != nil {
        SendErrorResult(res, err)
        return
    }

    for _, auth := range Hooks.Get.AuthorisationMiddleware() {
        if err = auth.Cat(ctx, path); err != nil {
            SendErrorResult(res, ErrNotAuthorized)
            return
        }
    }

    finfo, err := ctx.Backend.Stat(path)
    if err != nil {
        SendErrorResult(res, err)
        return
    }
    if finfo.IsDir() {
        SendErrorResult(res, ErrNotFound)
        return
    }

    file, err := openCachedFile(ctx, path)
    if err != nil {
        SendErrorResult(res, err)
        return
    }
    defer file.Close()

    contentLength := finfo.Size()
    start, end, err := parseSingleRange(req.Header.Get("Range"), contentLength)
    if err != nil {
        res.Header().Set("Content-Range", fmt.Sprintf("bytes */%d", contentLength))
        res.WriteHeader(http.StatusRequestedRangeNotSatisfiable)
        return
    }

    header := res.Header()
    header.Set("Accept-Ranges", "bytes")
    header.Set("Cache-Control", "no-cache")
    header.Set("Content-Type", GetMimeType(req.URL.Query().Get("path")))
    if finfo.ModTime().Unix() > 0 {
        header.Set("Last-Modified", finfo.ModTime().UTC().Format(http.TimeFormat))
    }
    if disable_csp() == false {
        header.Set("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; font-src data:; script-src-elem 'self'")
    }
    header.Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, contentLength))
    header.Set("Content-Length", fmt.Sprintf("%d", end-start+1))

    if req.Method == http.MethodHead {
        res.WriteHeader(http.StatusPartialContent)
        return
    }

    if _, err = file.Seek(start, io.SeekStart); err != nil {
        res.WriteHeader(http.StatusRequestedRangeNotSatisfiable)
        return
    }

    res.WriteHeader(http.StatusPartialContent)
    _, _ = io.CopyN(res, file, end-start+1)
}

func openCachedFile(ctx *App, path string) (*os.File, error) {
    key := make(map[string]string, len(ctx.Session)+1)
    for k, v := range ctx.Session {
        key[k] = v
    }
    key["__path__"] = path

    if cached := volumeExplorerCache.Get(key); cached != nil {
        if tmpPath, ok := cached.(string); ok {
            if f, err := os.Open(tmpPath); err == nil {
                return f, nil
            }
        }
    }

    reader, err := ctx.Backend.Cat(path)
    if err != nil {
        return nil, err
    }
    defer reader.Close()

    tmpFile, err := os.CreateTemp("", "volume-explorer-*.dat")
    if err != nil {
        return nil, err
    }
    tmpPath := tmpFile.Name()
    if _, err = io.Copy(tmpFile, reader); err != nil {
        tmpFile.Close()
        _ = os.Remove(tmpPath)
        return nil, err
    }
    if err = tmpFile.Close(); err != nil {
        _ = os.Remove(tmpPath)
        return nil, err
    }

    volumeExplorerCache.Set(key, tmpPath)
    return os.Open(tmpPath)
}

func parseSingleRange(raw string, contentLength int64) (int64, int64, error) {
    if contentLength <= 0 {
        return 0, 0, fmt.Errorf("invalid content length")
    }
    if !strings.HasPrefix(raw, "bytes=") {
        return 0, 0, fmt.Errorf("unsupported range unit")
    }

    spec := strings.TrimSpace(strings.TrimPrefix(raw, "bytes="))
    if spec == "" || strings.Contains(spec, ",") {
        return 0, 0, fmt.Errorf("unsupported range format")
    }

    parts := strings.SplitN(spec, "-", 2)
    if len(parts) != 2 {
        return 0, 0, fmt.Errorf("invalid range format")
    }

    if parts[0] == "" {
        suffixLength, err := strconv.ParseInt(parts[1], 10, 64)
        if err != nil || suffixLength <= 0 {
            return 0, 0, fmt.Errorf("invalid suffix range")
        }
        if suffixLength > contentLength {
            suffixLength = contentLength
        }
        return contentLength - suffixLength, contentLength - 1, nil
    }

    start, err := strconv.ParseInt(parts[0], 10, 64)
    if err != nil || start < 0 || start >= contentLength {
        return 0, 0, fmt.Errorf("invalid range start")
    }

    end := contentLength - 1
    if parts[1] != "" {
        end, err = strconv.ParseInt(parts[1], 10, 64)
        if err != nil {
            return 0, 0, fmt.Errorf("invalid range end")
        }
    }
    if end < start {
        return 0, 0, fmt.Errorf("invalid range bounds")
    }
    if end >= contentLength {
        end = contentLength - 1
    }

    return start, end, nil
}
