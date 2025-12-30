package plg_backend_perkeep

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Backend.Register("perkeep", &Perkeep{})
}

type Perkeep struct {
	serverURL string
}

func (this Perkeep) Init(params map[string]string, app *App) (IBackend, error) {
	url := params["url"]
	if url == "" {
		url = "http://localhost:3179/"
	}
	if !strings.HasSuffix(url, "/") {
		url += "/"
	}
	return &Perkeep{
		serverURL: url,
	}, nil
}

func (this Perkeep) Meta(path string) Metadata {
	return Metadata{
		CanCreateFile:      NewBool(false), // TODO
		CanCreateDirectory: NewBool(false), // TODO
		CanRename:          NewBool(false), // TODO
		CanMove:            NewBool(false), // TODO
		CanUpload:          NewBool(false), // TODO: see http://localhost:3179/bs-and-maybe-also-index/camli/upload

		CanDelete: NewBool(false), // TODO
	}
}

func (this Perkeep) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "perkeep",
			},
			{
				Name:        "url",
				Type:        "text",
				Placeholder: "eg: http://localhost:3179",
			},
		},
	}
}

func (this Perkeep) Ls(path string) ([]os.FileInfo, error) {
	var files []os.FileInfo

	if path == "/" {
		response, err := this.query(map[string]interface{}{ // curl 'http://localhost:3179/my-search/camli/search/query' -d '{"sort":"-created","constraint":{"permanode":{"attr": "camliRoot","valueMatches": {}}},"describe":{},"limit":-1}'
			"sort": "-created",
			"constraint": map[string]interface{}{
				"permanode": map[string]interface{}{
					"attr":         "camliRoot",
					"valueMatches": map[string]interface{}{},
				},
			},
			"describe": map[string]interface{}{},
			"limit":    1,
		})
		if err != nil {
			return nil, err
		}
		for _, blob := range response.Blobs {
			if meta, ok := response.Description.Meta[blob.Blob]; ok {
				if rootNames, ok := meta.Permanode.Attr["camliRoot"]; ok && len(rootNames) > 0 {
					files = append(files, File{
						FName: rootNames[0],
						FType: "directory",
						FTime: meta.Permanode.ModTime.Unix(),
					})
				}
			}
		}
		return files, nil
	}

	ref, err := this.getRef(path)
	if err != nil {
		return nil, err
	}

	response, err := this.query(map[string]interface{}{ // curl 'http://localhost:3179/my-search/camli/search/query' -d '{"sort":"-created","constraint":{"permanode":{"relation":{"relation":"parent","any":{"blobRefPrefix":"sha224-ff8f64ab406dc5aec7a35bf182dee79ea20d41bfffc2311fcb4acd9f"}}}},"describe":{"rules":[{"attrs": ["camliContent"]}]},"limit":50}'
		"sort": "-created",
		"constraint": map[string]interface{}{
			"permanode": map[string]interface{}{
				"relation": map[string]interface{}{
					"relation": "parent",
					"any": map[string]interface{}{
						"blobRefPrefix": ref,
					},
				},
			},
		},
		"describe": map[string]interface{}{
			"rules": []map[string]interface{}{
				{
					"attrs": []string{"camliContent", "title", "camliNodeType"},
				},
			},
		},
		"limit": 50,
	})
	if err != nil {
		return nil, err
	}
	for _, blob := range response.Blobs {
		if meta, ok := response.Description.Meta[blob.Blob]; ok {
			var (
				fileName string
				fileType string
				fileSize int64
				fileTime int64 = -1
			)
			if nodeType, ok := meta.Permanode.Attr["camliNodeType"]; ok && len(nodeType) > 0 && nodeType[0] == "directory" {
				if titles, ok := meta.Permanode.Attr["title"]; ok && len(titles) > 0 {
					fileType = "directory"
					fileName = titles[0]
					fileTime = meta.Permanode.ModTime.Unix()
				}
			} else if contentRefs, hasContent := meta.Permanode.Attr["camliContent"]; hasContent && len(contentRefs) > 0 {
				contentRef := contentRefs[0]
				if contentMeta, ok := response.Description.Meta[contentRef]; ok && contentMeta.File != nil {
					fileType = "file"
					fileName = contentMeta.File.FileName
					fileTime = contentMeta.File.Time.Unix()
					fileSize = contentMeta.File.Size
				}
			}
			if fileName != "" && fileType != "" {
				files = append(files, File{
					FName: fileName,
					FType: fileType,
					FSize: fileSize,
					FTime: fileTime,
				})
			}
		}
	}
	return files, nil
}

func (this Perkeep) Stat(path string) (os.FileInfo, error) {
	return nil, ErrNotImplemented
}

func (this Perkeep) Cat(path string) (io.ReadCloser, error) {
	ref, err := this.getRef(path)
	if err != nil {
		return nil, err
	}
	response, err := this.describe(ref)
	if err != nil {
		return nil, err
	}
	contentRefs, hasContent := response.Meta[ref].Permanode.Attr["camliContent"]
	if !hasContent || len(contentRefs) == 0 {
		return nil, NewError("No content", 400)
	}
	resp, err := http.Get(this.serverURL + "ui/download/" + contentRefs[0])
	if err != nil {
		return nil, NewError("Failed to fetch file: "+err.Error(), 500)
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, NewError("Failed to fetch file", resp.StatusCode)
	}
	return resp.Body, nil
}

func (this Perkeep) Mkdir(path string) error {
	return ErrNotImplemented
}

func (this Perkeep) Rm(path string) error {
	return ErrNotImplemented
}

func (this Perkeep) Mv(from, to string) error {
	return ErrNotImplemented
}

func (this Perkeep) Save(path string, content io.Reader) error {
	return ErrNotImplemented
}

func (this Perkeep) Touch(path string) error {
	return ErrNotImplemented
}

func (this *Perkeep) query(searchRequest any) (*SearchResponse, error) {
	queryJSON, err := json.Marshal(searchRequest)
	if err != nil {
		return nil, NewError("Failed to marshal search query: "+err.Error(), 500)
	}
	req, err := http.NewRequest(
		"POST",
		this.serverURL+"my-search/camli/search/query",
		bytes.NewBuffer(queryJSON),
	)
	if err != nil {
		return nil, NewError("Failed to create request: "+err.Error(), 500)
	}
	resp, err := HTTPClient.Do(req)
	if err != nil {
		return nil, NewError("Failed to query perkeep: "+err.Error(), 500)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, NewError(fmt.Sprintf("Perkeep API error (%d): %s", resp.StatusCode, string(body)), 500)
	}
	var result SearchResponse
	err = json.NewDecoder(resp.Body).Decode(&result)
	return &result, err
}

func (this *Perkeep) describe(blobRef string) (*DescribeResponse, error) {
	describeJSON, err := json.Marshal(map[string]interface{}{
		"blobRef": blobRef,
	})
	if err != nil {
		return nil, NewError("Failed to marshal describe request: "+err.Error(), 500)
	}
	req, err := http.NewRequest(
		"POST",
		this.serverURL+"my-search/camli/search/describe",
		bytes.NewBuffer(describeJSON),
	)
	if err != nil {
		return nil, NewError("Failed to create request: "+err.Error(), 500)
	}
	resp, err := HTTPClient.Do(req)
	if err != nil {
		return nil, NewError("Failed to describe perkeep: "+err.Error(), 500)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, NewError(fmt.Sprintf("Perkeep API error (%d): %s", resp.StatusCode, string(body)), 500)
	}
	var result DescribeResponse
	err = json.NewDecoder(resp.Body).Decode(&result)
	return &result, err
}

func (this *Perkeep) getRef(path string) (string, error) {
	path = strings.Trim(path, "/")
	if path == "" {
		return "", NewError("Empty path", 400)
	}
	pathChunks := strings.Split(path, "/")
	response, err := this.query(map[string]interface{}{
		"constraint": map[string]interface{}{
			"permanode": map[string]interface{}{
				"attr":  "camliRoot",
				"value": pathChunks[0],
			},
		},
		"describe": map[string]interface{}{},
		"limit":    1,
	})
	if err != nil {
		return "", err
	} else if len(response.Blobs) == 0 {
		return "", NewError("Root folder not found: "+pathChunks[0], 404)
	}
	currentRef := response.Blobs[0].Blob
	for i := 1; i < len(pathChunks); i++ {
		childResponse, err := this.query(map[string]interface{}{
			"constraint": map[string]interface{}{
				"permanode": map[string]interface{}{
					"relation": map[string]interface{}{
						"relation": "parent",
						"any": map[string]interface{}{
							"blobRefPrefix": currentRef,
						},
					},
				},
			},
			"describe": map[string]interface{}{
				"rules": []map[string]interface{}{
					{
						"attrs": []string{"camliContent"},
					},
				},
			},
			"limit": -1,
		})
		if err != nil {
			return "", err
		}
		found := false
		for _, blob := range childResponse.Blobs {
			if meta, ok := childResponse.Description.Meta[blob.Blob]; ok {
				if titles, ok := meta.Permanode.Attr["title"]; ok && len(titles) > 0 {
					if titles[0] == pathChunks[i] {
						currentRef = blob.Blob
						found = true
						break
					}
				} else if contentRefs, hasContent := meta.Permanode.Attr["camliContent"]; hasContent && len(contentRefs) > 0 {
					if contentMeta, ok := childResponse.Description.Meta[contentRefs[0]]; ok && contentMeta.File != nil {
						if contentMeta.File.FileName == pathChunks[i] {
							currentRef = blob.Blob
							found = true
							break
						}
					}
				}
			}
		}
		if !found {
			return "", NewError("Path element not found: "+pathChunks[i], 404)
		}
	}
	return currentRef, nil
}
