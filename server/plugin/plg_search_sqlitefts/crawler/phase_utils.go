package plg_search_sqlitefts

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/converter"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/indexer"
)

func updateFile(path string, backend IBackend, tx indexer.Manager) error {
	if err := tx.IndexTimeUpdate(path, time.Now()); err != nil {
		return err
	}
	for i := 0; i < len(INDEXING_EXCLUSION); i++ {
		if strings.Contains(path, INDEXING_EXCLUSION[i]) {
			return nil
		}
	}
	reader, err := backend.Cat(path)
	if err != nil {
		tx.RemoveAll(path)
		return err
	}
	defer reader.Close()
	convertedReader, err := converter.Convert(path, reader)
	if err != nil {
		return nil
	}
	defer convertedReader.Close()
	if err = tx.FileContentUpdate(path, reader); err != nil {
		Log.Warning("search::index index_update (%v)", err)
		return err
	}
	return nil
}

func updateFolder(path string, backend IBackend, tx indexer.Manager) error {
	if err := tx.IndexTimeUpdate(path, time.Now()); err != nil {
		return err
	}

	for i := 0; i < len(INDEXING_EXCLUSION); i++ {
		if strings.Contains(path, INDEXING_EXCLUSION[i]) {
			return nil
		}
	}

	// Fetch list of folders as in the remote filesystem
	currFiles, err := backend.Ls(path)
	if err != nil {
		tx.RemoveAll(path)
		return err
	}

	// Fetch FS as appear in our search cache
	rows, err := tx.FindParent(path)
	if err != nil {
		return err
	}
	defer rows.Close()
	previousFiles := make([]File, 0)
	for rows.Next() {
		r, err := rows.Value()
		if err != nil {
			return err
		}
		previousFiles = append(previousFiles, File{
			FName: r.Name,
			FSize: r.Size,
			FPath: r.Path,
		})
	}

	// Perform the DB operation to ensure previousFiles and currFiles are in sync
	// 1. Find the content that have been created and did not exist before
	for i := 0; i < len(currFiles); i++ {
		currFilenameAlreadyExist := false
		currFilename := currFiles[i].Name()
		for j := 0; j < len(previousFiles); j++ {
			if currFilename == previousFiles[j].Name() {
				if currFiles[i].Size() != previousFiles[j].Size() {
					if err = dbUpdate(path, currFiles[i], tx); err != nil {
						return err
					}
					break
				}
				currFilenameAlreadyExist = true
				break
			}
		}
		if currFilenameAlreadyExist == false {
			dbInsert(path, currFiles[i], tx)
		}
	}
	// 2. Find the content that was existing before but got removed
	for i := 0; i < len(previousFiles); i++ {
		previousFilenameStillExist := false
		previousFilename := previousFiles[i].Name()
		for j := 0; j < len(currFiles); j++ {
			if previousFilename == currFiles[j].Name() {
				previousFilenameStillExist = true
				break
			}
		}
		if previousFilenameStillExist == false {
			p := filepath.Join(path, previousFiles[i].Name())
			if previousFiles[i].IsDir() {
				p += "/"
			}
			tx.RemoveAll(p)
		}
	}
	return nil
}

func dbInsert(parent string, f os.FileInfo, tx indexer.Manager) error {
	return tx.FileCreate(f, parent)
}

func dbUpdate(parent string, f fs.FileInfo, tx indexer.Manager) error {
	path := filepath.Join(parent, f.Name())
	if f.IsDir() {
		path += "/"
	}
	return tx.FileMetaUpdate(path, f)
}
