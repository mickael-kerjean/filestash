package plg_search_stateless

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"path/filepath"
	"strings"
	"time"
)

func init() {
	Hooks.Register.SearchEngine(StatelessSearch{})
}

type PathQuandidate struct {
	Path  string
	Score int
}

type StatelessSearch struct{}

func (this StatelessSearch) Query(app App, path string, keyword string) ([]IFile, error) {
	files := make([]IFile, 0)
	toVisit := []PathQuandidate{PathQuandidate{path, 0}}
	MAX_SEARCH_TIME := SEARCH_TIMEOUT()

	for start := time.Now(); time.Since(start) < MAX_SEARCH_TIME; {
		if len(toVisit) == 0 {
			return files, nil
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
			if isAMatch := IsSearchQueryMatchingFilename(
				[]rune(strings.ToLower(name)),
				[]rune(strings.ToLower(keyword)),
			); isAMatch {
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
					FPath: func() string {
						p := filepath.Join(currentPath.Path, name)
						if f[i].IsDir() {
							p = p + "/"
						}
						return p
					}(),
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
	return files, nil
}
