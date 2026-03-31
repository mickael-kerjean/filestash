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
		entryType := "file"
		if strings.HasSuffix(file.FPath, "/") {
			entryType = "directory"
		}
		entries = append(entries, fmt.Sprintf("%d: path=%s type=%s size=%d last_accessed=%s", i, file.FPath, entryType, file.FSize, accessed))
	}

	body, err := json.Marshal(map[string]any{
		"model": model,
		"messages": []map[string]string{
			{
				"role": "system",
				"content": fmt.Sprintf(`You filter recently accessed files and folders based on a search query.
Today is %s.
Each entry has: index, path, type (file or directory), size (bytes), last_accessed (YYYY-MM-DD HH:MM).

Apply these rules strictly:
- Temporal queries ("2 hours ago", "3 days ago", "last week", "today", "recent"): include ONLY entries whose last_accessed falls within that date range. Exclude everything else.
- Type queries ("files", "folders", "images", "documents"): include ONLY entries matching that type or extension.
- Name queries: match against path.
- Size queries ("big", "small", "large"): filter by size.
- Combined queries: apply all matching rules together.

Output ONLY comma-separated indices, e.g.: 3,0,7,1
No brackets, no spaces, no explanation. Most relevant first. Omit irrelevant results entirely.`, time.Now().Format("Monday January 2, 2006")),
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
