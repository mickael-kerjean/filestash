package plg_search_stateless

import (
	"os"
	"path/filepath"
	"strings"
)

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
