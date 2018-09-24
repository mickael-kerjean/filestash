package model

import (
	//"fmt"
	. "github.com/mickael-kerjean/nuage/server/common"
	"io/ioutil"
	//"os"
	"strings"
	"testing"
)

var app *App

func init() {
	app = &App{}
	app.Config = &Config{}
	app.Config.Initialise()
	app.Config.General.Host = "http://test"
	app.Config.OAuthProvider.Dropbox.ClientID = ""
	app.Config.OAuthProvider.GoogleDrive.ClientID = ""
	app.Config.OAuthProvider.GoogleDrive.ClientID = ""
}

// func TestWebdav(t *testing.T) {
// 	if os.Getenv("WEBDAV_URL") == "" {
// 		fmt.Println("- skipped webdav")
// 		return
// 	}
// 	b, err := NewBackend(&App{}, map[string]string{
// 		"type": "webdav",
// 		"url":  os.Getenv("WEBDAV_URL"),
// 	})
// 	if err != nil {
// 		t.Errorf("Can't create WebDav backend")
// 	}
// 	setup(t, b)
// 	suite(t, b)
// 	tearDown(t, b)
// }

// func TestFtp(t *testing.T) {
// 	if os.Getenv("FTP_USERNAME") == "" || os.Getenv("FTP_PASSWORD") == "" {
// 		fmt.Println("- skipped ftp")
// 		return
// 	}
// 	b, err := NewBackend(&App{}, map[string]string{
// 		"type":     "ftp",
// 		"hostname": "127.0.0.1",
// 		"username": os.Getenv("FTP_USERNAME"),
// 		"password": os.Getenv("FTP_PASSWORD"),
// 	})
// 	if err != nil {
// 		t.Errorf("Can't create FTP backend")
// 	}
// 	setup(t, b)
// 	suite(t, b)
// 	tearDown(t, b)
// 	b.Rm("/tmp/")
// }

// func TestSFtp(t *testing.T) {
// 	if os.Getenv("SFTP_USERNAME") == "" || os.Getenv("SFTP_PASSWORD") == "" {
// 		fmt.Println("- skipped sftp")
// 		return
// 	}
// 	b, err := NewBackend(&App{}, map[string]string{
// 		"type":     "sftp",
// 		"hostname": "127.0.0.1",
// 		"username": os.Getenv("SFTP_USERNAME"),
// 		"password": os.Getenv("SFTP_PASSWORD"),
// 	})
// 	if err != nil {
// 		t.Errorf("Can't create SFTP backend")
// 	}
// 	setup(t, b)
// 	suite(t, b)
// 	tearDown(t, b)
// }

// func TestGit(t *testing.T) {
// 	if os.Getenv("GIT_USERNAME") == "" || os.Getenv("GIT_PASSWORD") == "" {
// 		fmt.Println("- skipped git")
// 		return
// 	}
// 	b, err := NewBackend(app, map[string]string{
// 		"type":     "git",
// 		"repo":     "https://github.com/mickael-kerjean/tmp",
// 		"username": os.Getenv("GIT_EMAIL"),
// 		"password": os.Getenv("GIT_PASSWORD"),
// 	})
// 	if err != nil {
// 		t.Errorf("Can't create Git backend")
// 	}
// 	setup(t, b)
// 	suite(t, b)
// 	tearDown(t, b)
// }

// func TestS3(t *testing.T) {
// 	if os.Getenv("S3_ID") == "" || os.Getenv("S3_SECRET") == "" {
// 		fmt.Println("- skipped S3")
// 		return
// 	}
// 	b, err := NewBackend(&App{}, map[string]string{
// 		"type":              "s3",
// 		"access_key_id":     os.Getenv("S3_ID"),
// 		"secret_access_key": os.Getenv("S3_SECRET"),
// 		"endpoint":          os.Getenv("S3_ENDPOINT"),
// 	})
// 	if err != nil {
// 		t.Errorf("Can't create S3 backend")
// 	}
// 	setup(t, b)
// 	suite(t, b)
// 	tearDown(t, b)
// }

// func TestDropbox(t *testing.T) {
// 	if os.Getenv("DROPBOX_TOKEN") == "" {
// 		fmt.Println("- skipped Dropbox")
// 		return
// 	}
// 	b, err := NewBackend(app, map[string]string{
// 		"type":   "dropbox",
// 		"bearer": os.Getenv("DROPBOX_TOKEN"),
// 	})
// 	if err != nil {
// 		t.Errorf("Can't create a Dropbox backend")
// 	}
// 	setup(t, b)
// 	suite(t, b)
// 	tearDown(t, b)
// }

// func TestGoogleDrive(t *testing.T) {
// 	if os.Getenv("GDRIVE_TOKEN") == "" {
// 		fmt.Println("- skipped Google Drive")
// 		return
// 	}
// 	b, err := NewBackend(app, map[string]string{
// 		"type":   "gdrive",
// 		"expiry": "",
// 		"token":  os.Getenv("GDRIVE_TOKEN"),
// 	})
// 	if err != nil {
// 		t.Errorf("Can't create a Google Drive backend")
// 	}
// 	setup(t, b)
// 	suite(t, b)
// 	tearDown(t, b)
// }

func setup(t *testing.T, b IBackend) {
	b.Rm("/tmp/test/")
	b.Mkdir("/tmp/")
	b.Mkdir("/tmp/test/")
}
func tearDown(t *testing.T, b IBackend) {
	b.Rm("/tmp/test/")
}

func suite(t *testing.T, b IBackend) {
	// create state
	content := "lorem ipsum"
	b.Mkdir("/tmp/test/trash/")
	b.Touch("/tmp/test/test0.txt")
	b.Save("/tmp/test/test0.txt", strings.NewReader(content))
	b.Save("/tmp/test/test1.txt", strings.NewReader(content))
	b.Touch("/tmp/test/test2.txt")
	b.Mv("/tmp/test/test0.txt", "/tmp/test/trash/test0.txt")

	// list all files
	tmp0, err := b.Ls("/tmp/test/")
	if err != nil {
		t.Errorf("Ls error: %s", err)
		return
	}
	if len(tmp0) != 3 {
		t.Errorf("LS error: got: %d elmnt, want: %d", len(tmp0), 3)
		return
	}

	// read file
	tmp1, err := b.Cat("/tmp/test/trash/test0.txt")
	if err != nil {
		t.Errorf("Cat error: %s", err)
		return
	}
	tmp2, err := ioutil.ReadAll(tmp1)
	if err != nil {
		t.Errorf("Cat error: %s", err)
		return
	}
	if string(tmp2) != content {
		t.Errorf("Incorrect file: %s, want: %s.", tmp2, content)
		return
	}
	if obj, ok := tmp1.(interface{ Close() error }); ok {
		obj.Close()
	}
	tmp1, err = b.Cat("/tmp/test/test1.txt")
	if err != nil {
		t.Errorf("Cat error: %s", err)
		return
	}
	tmp2, err = ioutil.ReadAll(tmp1)
	if err != nil {
		t.Errorf("Cat error: %s", err)
		return
	}
	if string(tmp2) != content {
		t.Errorf("Incorrect file: %s, want: %s.", tmp2, content)
		return
	}
	if obj, ok := tmp1.(interface{ Close() error }); ok {
		obj.Close()
	}

	tmp1, err = b.Cat("/tmp/test/test2.txt")
	if err != nil {
		t.Errorf("Cat error: %s", err)
		return
	}
	tmp2, err = ioutil.ReadAll(tmp1)
	if err != nil {
		t.Errorf("Cat error: %s", err)
		return
	}
	if string(tmp2) != "" {
		t.Errorf("Incorrect file: %s, want: %s.", tmp2, "")
		return
	}
	if obj, ok := tmp1.(interface{ Close() error }); ok {
		obj.Close()
	}

	// remove file
	b.Rm("/tmp/test/test2.txt")
	tmp0, err = b.Ls("/tmp/test/")
	if len(tmp0) != 2 {
		t.Errorf("Test folder elements, got: %d, want: %d.", len(tmp0), 2)
		return
	}

	tmp0, err = b.Ls("/tmp/test/")
	if err != nil {
		t.Errorf("Ls error %s", err)
		return
	}
	if len(tmp0) != 2 {
		t.Errorf("LS error: got: %d elmnt, want: %d", len(tmp0), 2)
		return
	}

	// remove folder
	b.Rm("/tmp/test/")
	tmp0, err = b.Ls("/tmp/test/")
	if err == nil {
		t.Errorf("Removed folder still exists: %d", len(tmp0))
		return
	}
}
