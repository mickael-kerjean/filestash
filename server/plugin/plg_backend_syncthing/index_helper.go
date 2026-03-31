package plg_backend_syncthing

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

type SyncFolder struct {
	ID       string
	Name     string
	Path     string
	SyncPath string
}

func (s *Syncthing) makeAPICall(endpoint string, params map[string]string) ([]byte, error) {
	query := url.Values{}
	for k, v := range params {
		query.Set(k, v)
	}
	apiURL := fmt.Sprintf("%s%s", s.baseURL, endpoint)
	if len(query) > 0 {
		apiURL += "?" + query.Encode()
	}

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-API-Key", s.apiKey)
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}
	return body, nil
}

func (s *Syncthing) fetchFolders() ([]SyncFolder, error) {
	data, err := s.makeAPICall("/rest/config", nil)
	if err != nil {
		return nil, err
	}
	var config struct {
		Folders []struct {
			ID    string `json:"id"`
			Label string `json:"label"`
			Path  string `json:"path"`
		} `json:"folders"`
	}
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}
	folders := make([]SyncFolder, 0, len(config.Folders))
	for _, folder := range config.Folders {
		name := folder.Label
		if name == "" {
			name = folder.ID
		}
		folders = append(folders, SyncFolder{
			ID:   folder.ID,
			Name: name,
			Path: folder.Path,
		})
	}
	return folders, nil
}

func (s *Syncthing) listDirectory(path string) ([]os.FileInfo, error) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 {
		return nil, ErrNotValid
	}
	folderName := parts[0]
	prefix := ""
	if len(parts) > 1 {
		prefix = strings.Join(parts[1:], "/")
	}
	var folderID string
	for _, folder := range s.folders {
		if folder.Name == folderName {
			folderID = folder.ID
			break
		}
	}
	if folderID == "" {
		return nil, ErrNotFound
	}
	data, err := s.makeAPICall("/rest/db/browse", map[string]string{
		"folder": folderID,
		"prefix": prefix,
		"levels": "1",
	})
	if err != nil {
		return nil, err
	}
	var result []struct {
		Name     string `json:"name"`
		Type     string `json:"type"`
		Size     int64  `json:"size"`
		Modified string `json:"modTime"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	var fileInfos []os.FileInfo
	for _, item := range result {
		modTime := time.Time{}
		if item.Modified != "" {
			if t, err := time.Parse(time.RFC3339Nano, item.Modified); err == nil {
				modTime = t
			}
		}
		if item.Type == "FILE_INFO_TYPE_DIRECTORY" {
			fileInfos = append(fileInfos, &File{
				FName: item.Name,
				FType: "directory",
				FTime: modTime.Unix(),
			})
		} else if item.Type == "FILE_INFO_TYPE_FILE" {
			isOffline := s.syncPath == ""
			fileInfos = append(fileInfos, &File{
				FName:   item.Name,
				FType:   "file",
				FSize:   item.Size,
				FTime:   modTime.Unix(),
				Offline: isOffline,
			})
		} else {
			Log.Error("plg_backend_syncthing::ls error=unknownItemType type=%s", item.Type)
		}
	}
	return fileInfos, nil
}

func (s *Syncthing) resolvePath(path string) (string, error) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 {
		return "", ErrNotValid
	}
	folderName := parts[0]
	relativePath := ""
	if len(parts) > 1 {
		relativePath = strings.Join(parts[1:], "/")
	}
	for _, folder := range s.folders {
		if folder.Name == folderName {
			return filepath.Join(s.syncPath, folder.Path, relativePath), nil
		}
	}
	return "", ErrNotFound
}
