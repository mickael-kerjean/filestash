package plg_widget_recent

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func aiFilterRecent(ctx context.Context, query string, files []os.FileInfo) ([]os.FileInfo, error) {
	endpoint := PluginEndpoint()
	model := PluginModel()
	if endpoint == "" || model == "" {
		return files, nil
	}

	entries := make([]string, 0, len(files))
	for i, f := range files {
		file := f.(File)
		accessed := time.UnixMilli(file.FTime).Format("2006-01-02 15:04")
		entries = append(entries, fmt.Sprintf("%d: path=%s size=%d last_accessed=%s", i, file.FPath, file.FSize, accessed))
	}

	body, err := json.Marshal(map[string]any{
		"model": model,
		"messages": []map[string]string{
			{
				"role": "system",
				"content": fmt.Sprintf(`You filter recently accessed files by relevance to a search query.
Today is %s.
Each entry has: index, path, size (bytes), last_accessed (YYYY-MM-DD HH:MM).
Use all available metadata to answer the query - size for "big/small files", last_accessed for "last week/recent/old", path for name/type matching.

Output ONLY comma-separated numbers, e.g.: 3,0,7,1
No brackets, no spaces, no explanation. Most relevant first. Omit irrelevant results entirely.`, time.Now().Format("2006-01-02")),
			},
			{
				"role":    "user",
				"content": fmt.Sprintf("Query: %s\n\nFiles:\n%s", query, strings.Join(entries, "\n")),
			},
		},
		"temperature": 0,
		"max_tokens":  500,
	})
	if err != nil {
		return files, nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return files, nil
	}
	req.Header.Set("Content-Type", "application/json")
	if apiKey := PluginAPIKey(); apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return files, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return files, nil
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return files, nil
	} else if len(result.Choices) == 0 {
		return files, nil
	}
	filtered := make([]os.FileInfo, 0)
	for _, part := range strings.Split(result.Choices[0].Message.Content, ",") {
		idx, err := strconv.Atoi(strings.TrimSpace(part))
		if err != nil || idx < 0 || idx >= len(files) {
			continue
		}
		filtered = append(filtered, files[idx])
	}
	return filtered, nil
}
