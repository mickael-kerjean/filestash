package plg_application_volumeexplorer

import (
    "fmt"
    "io"
    "net/http"
    "net/url"
    "os"
    pathpkg "path"
    "strconv"
    "strings"
    "time"

    . "github.com/mickael-kerjean/filestash/server/common"
    ctrl "github.com/mickael-kerjean/filestash/server/ctrl"
    . "github.com/mickael-kerjean/filestash/server/middleware"
    "github.com/mickael-kerjean/filestash/server/model"

    "github.com/gorilla/mux"
)

var volumeExplorerCache = NewAppCache(60, 10)
var volumeExplorerLaunchCache = NewAppCache(60, 10)

type launchContext struct {
    SessionID string
    RootPath  string
}

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
        r.HandleFunc("/api/plg_application_volumeexplorer/cat/{file:.*}", NewMiddlewareChain(
            fileCatProxy,
            []Middleware{ApiHeaders, SecureHeaders, SessionStart, LoggedInOnly},
        )).Methods("GET", "HEAD")
        r.HandleFunc("/api/plg_application_volumeexplorer/launch", NewMiddlewareChain(
            launchSource,
            []Middleware{ApiHeaders, SecureHeaders, SessionStart, LoggedInOnly},
        )).Methods("GET")
        r.HandleFunc("/api/plg_application_volumeexplorer/tree/{token}/{file:.*}", NewMiddlewareChain(
            treeFileProxy,
            []Middleware{ApiHeaders, SecureHeaders, SessionStart, LoggedInOnly},
        )).Methods("GET", "HEAD")
        return nil
    })
}

func launchSource(ctx *App, res http.ResponseWriter, req *http.Request) {
    if model.CanRead(ctx) == false {
        SendErrorResult(res, ErrPermissionDenied)
        return
    }

    requestedPath := req.URL.Query().Get("path")
    if requestedPath == "" {
        SendErrorResult(res, NewError("missing path parameter", 400))
        return
    }

    path, err := ctrl.PathBuilder(ctx, requestedPath)
    if err != nil {
        SendErrorResult(res, err)
        return
    }
    requestedIsDir := strings.HasSuffix(requestedPath, "/")

    finfo, err := ctx.Backend.Stat(path)
    if err != nil {
        SendErrorResult(res, err)
        return
    }

    if requestedIsDir == false && finfo.IsDir() == false {
        if err = ensureCatAuthorised(ctx, path); err != nil {
            SendErrorResult(res, err)
            return
        }
        SendSuccessResult(res, map[string]string{
            "src": "/api/plg_application_volumeexplorer/cat?path=" + url.QueryEscape(requestedPath),
        })
        return
    }

    rootPath := path
    if strings.HasSuffix(rootPath, "/") == false {
        rootPath += "/"
    }

    sessionID := GenerateID(ctx.Session)
    token := QuickHash(fmt.Sprintf("%s|%s|%d", sessionID, rootPath, time.Now().UnixNano()), 32)
    volumeExplorerLaunchCache.SetKey(token, launchContext{
        SessionID: sessionID,
        RootPath:  rootPath,
    })
    Log.Info(
        "plg_application_volumeexplorer::launch token=%s requested=%q root=%q",
        token,
        requestedPath,
        rootPath,
    )

    SendSuccessResult(res, map[string]string{
        "src": "/api/plg_application_volumeexplorer/tree/" + token + "/?source=" + url.QueryEscape(requestedPath),
    })
}

func treeFileProxy(ctx *App, res http.ResponseWriter, req *http.Request) {
    vars := mux.Vars(req)
    token := vars["token"]
    rawRelativePath := vars["file"]

    cached, found := volumeExplorerLaunchCache.Cache.Get(token)
    launch, ok := cached.(launchContext)
    if token == "" || !found || !ok {
        Log.Info(
            "plg_application_volumeexplorer::tree miss token=%s found=%t ok=%t relative=%q",
            token,
            found,
            ok,
            rawRelativePath,
        )
        SendErrorResult(res, ErrNotFound)
        return
    }

    if launch.SessionID != GenerateID(ctx.Session) {
        Log.Info(
            "plg_application_volumeexplorer::tree session_mismatch token=%s launch_session=%q request_session=%q",
            token,
            launch.SessionID,
            GenerateID(ctx.Session),
        )
        SendErrorResult(res, ErrNotAuthorized)
        return
    }

    relativePath, err := url.PathUnescape(rawRelativePath)
    if err != nil {
        SendErrorResult(res, ErrNotValid)
        return
    }

    targetPath, err := resolveTreePath(launch.RootPath, relativePath)
    if err != nil {
        Log.Info(
            "plg_application_volumeexplorer::tree invalid_path token=%s root=%q relative=%q",
            token,
            launch.RootPath,
            relativePath,
        )
        SendErrorResult(res, ErrNotValid)
        return
    }
    Log.Info(
        "plg_application_volumeexplorer::tree token=%s source=%q relative=%q target=%q",
        token,
        req.URL.Query().Get("source"),
        relativePath,
        targetPath,
    )

    if err = ensureCatAuthorised(ctx, targetPath); err != nil {
        Log.Info(
            "plg_application_volumeexplorer::tree unauthorized token=%s target=%q",
            token,
            targetPath,
        )
        SendErrorResult(res, err)
        return
    }

    serveBackendFile(ctx, res, req, targetPath, relativePath)
}

func fileCatProxy(ctx *App, res http.ResponseWriter, req *http.Request) {
    vars := mux.Vars(req)
    rawRelativePath := vars["file"]

    Log.Info(
        "plg_application_volumeexplorer::cat method=%s path=%s relative=%q range=%q",
        req.Method,
        req.URL.Query().Get("path"),
        rawRelativePath,
        req.Header.Get("Range"),
    )

    if req.Header.Get("Range") == "" && rawRelativePath == "" {
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

    targetPath, err := ctrl.PathBuilder(ctx, req.URL.Query().Get("path"))
    if err != nil {
        SendErrorResult(res, err)
        return
    }

    mimeHint := req.URL.Query().Get("path")
    if rawRelativePath != "" {
        relativePath, err := url.PathUnescape(rawRelativePath)
        if err != nil {
            SendErrorResult(res, ErrNotValid)
            return
        }
        targetPath, err = resolveTreePath(targetPath, relativePath)
        if err != nil {
            SendErrorResult(res, ErrNotValid)
            return
        }
        mimeHint = relativePath
    }

    if err = ensureCatAuthorised(ctx, targetPath); err != nil {
        SendErrorResult(res, err)
        return
    }

    serveBackendFile(ctx, res, req, targetPath, mimeHint)
}

func serveBackendFile(ctx *App, res http.ResponseWriter, req *http.Request, path string, mimeHint string) {
    finfo, err := ctx.Backend.Stat(path)
    if err != nil {
        SendErrorResult(res, err)
        return
    }
    if finfo.IsDir() {
        SendErrorResult(res, ErrNotFound)
        return
    }

    contentLength := finfo.Size()
    setResponseHeaders(res, finfo, mimeHint)

    if req.Header.Get("Range") == "" {
        res.Header().Set("Content-Length", fmt.Sprintf("%d", contentLength))
        if req.Method == http.MethodHead {
            res.WriteHeader(http.StatusOK)
            return
        }

        reader, err := ctx.Backend.Cat(path)
        if err != nil {
            SendErrorResult(res, err)
            return
        }
        defer reader.Close()

        res.WriteHeader(http.StatusOK)
        _, _ = io.Copy(res, reader)
        return
    }

    file, err := openCachedFile(ctx, path)
    if err != nil {
        SendErrorResult(res, err)
        return
    }
    defer file.Close()

    start, end, err := parseSingleRange(req.Header.Get("Range"), contentLength)
    if err != nil {
        res.Header().Set("Content-Range", fmt.Sprintf("bytes */%d", contentLength))
        res.WriteHeader(http.StatusRequestedRangeNotSatisfiable)
        return
    }

    header := res.Header()
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

func setResponseHeaders(res http.ResponseWriter, finfo os.FileInfo, mimeHint string) {
    header := res.Header()
    header.Set("Accept-Ranges", "bytes")
    header.Set("Cache-Control", "no-cache")
    header.Set("Content-Type", volumeExplorerMimeType(mimeHint))
    if finfo.ModTime().Unix() > 0 {
        header.Set("Last-Modified", finfo.ModTime().UTC().Format(http.TimeFormat))
    }
    header.Set("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; font-src data:; script-src-elem 'self'")
}

func volumeExplorerMimeType(path string) string {
    switch pathpkg.Base(path) {
    case ".zarray", ".zattrs", ".zgroup", ".zmetadata":
        return "application/json"
    default:
        return GetMimeType(path)
    }
}

func ensureCatAuthorised(ctx *App, path string) error {
    for _, auth := range Hooks.Get.AuthorisationMiddleware() {
        if err := auth.Cat(ctx, path); err != nil {
            return ErrNotAuthorized
        }
    }
    return nil
}

func resolveTreePath(rootPath string, relativePath string) (string, error) {
    if rootPath == "" || relativePath == "" {
        return "", fmt.Errorf("invalid path")
    }
    if strings.Contains(relativePath, "\x00") {
        return "", fmt.Errorf("invalid path")
    }

    cleaned := pathpkg.Clean("/" + relativePath)
    cleaned = strings.TrimPrefix(cleaned, "/")
    if cleaned == "" {
        return "", fmt.Errorf("invalid path")
    }

    for _, part := range strings.Split(cleaned, "/") {
        if part == ".." {
            return "", fmt.Errorf("invalid path")
        }
    }

    if strings.HasSuffix(rootPath, "/") == false {
        rootPath += "/"
    }
    return rootPath + cleaned, nil
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
