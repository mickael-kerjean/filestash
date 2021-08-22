package model

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type PathQuandidate struct {
	Path  string
	Score int
}

func scoreBoostForPath(p string) int {
	b := strings.ToLower(filepath.Base(p))

	// some path are garbage we don't want to explore unless there's nothing else to do
	if b == "node_modules" {
		return -100
	} else if strings.HasPrefix(b, ".") {
		return -10
	}

	// not all path are equally interesting, we bump the score of what we thing is interesting
	score := 0
	if strings.Contains(b, "document") {
		score += 3
	} else if strings.Contains(b, "project") {
		score += 3
	} else if strings.Contains(b, "home") {
		score += 3
	} else if strings.Contains(b, "note") {
		score += 3
	}
	return score
}

func scoreBoostForFilesInDirectory(f []os.FileInfo) int {
	s := 0
	for i := 0; i < len(f); i++ {
		name := f[i].Name()
		if f[i].IsDir() == false {
			if strings.HasSuffix(name, ".org") {
				s += 2
			} else if strings.HasSuffix(name, ".pdf") {
				s += 1
			} else if strings.HasSuffix(name, ".doc") || strings.HasSuffix(name, ".docx") {
				s += 1
			} else if strings.HasSuffix(name, ".md") {
				s += 1
			} else if strings.HasSuffix(name, ".pdf") {
				s += 1
			}
		}
		if s > 4 {
			return 4
		}
	}
	return s
}

func scoreBoostOnDepth(p string) int {
	return -strings.Count(p, "/")
}

func SearchStateLess(app *App, path string, keyword string) []File {
	files := make([]File, 0)
	toVisit := []PathQuandidate{PathQuandidate{path, 0}}
	MAX_SEARCH_TIME := SEARCH_TIMEOUT()

	for start := time.Now(); time.Since(start) < MAX_SEARCH_TIME; {
		if len(toVisit) == 0 {
			return files
		}
		currentPath := toVisit[0]
		if len(toVisit) == 0 {
			toVisit = make([]PathQuandidate, 0)
		} else {
			toVisit = toVisit[1:]
		}

		// Ls on the directory
		f, err := app.Backend.Ls(currentPath.Path)
		if err != nil {
			continue
		}

		score1 := scoreBoostForFilesInDirectory(f)
		for i := 0; i < len(f); i++ {
			name := f[i].Name()
			// keyword matching
			isAMatch := true
			for _, key := range strings.Split(keyword, " ") {
				if strings.Contains(strings.ToLower(name), strings.ToLower(key)) == false {
					isAMatch = false
				}
			}
			if isAMatch {
				files = append(files, File{
					FName: name,
					FType: func() string {
						if f[i].IsDir() {
							return "directory"
						}
						return "file"
					}(),
					FSize: f[i].Size(),
					FTime: f[i].ModTime().Unix() * 1000,
					FPath: currentPath.Path + name,
				})
			}

			// follow directories
			fullpath := currentPath.Path + name + "/"
			relativePath := strings.ToLower(strings.TrimSuffix(strings.TrimPrefix(fullpath, path), "/"))
			score2 := scoreBoostOnDepth(relativePath) * 2
			if f[i].IsDir() {
				score := scoreBoostForPath(relativePath)
				if score < 0 {
					continue
				}
				score += score1
				score += score2
				score += currentPath.Score
				t := make([]PathQuandidate, len(toVisit)+1)
				k := 0
				for k = 0; k < len(toVisit); k++ {
					if score > toVisit[k].Score {
						break
					}
					t[k] = toVisit[k]
				}
				t[k] = PathQuandidate{fullpath, score}
				for k = k + 1; k < len(toVisit)+1; k++ {
					t[k] = toVisit[k-1]
				}
				toVisit = t
			}
		}
	}
	return files
}
