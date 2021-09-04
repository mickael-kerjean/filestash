// Copyright 2015 Muir Manders.  All rights reserved.
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.

package goftp

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// time.Parse format string for parsing file mtimes.
const timeFormat = "20060102150405"

// Delete deletes the file "path".
func (c *Client) Delete(path string) error {
	pconn, err := c.getIdleConn()
	if err != nil {
		return err
	}

	defer c.returnConn(pconn)

	return pconn.sendCommandExpected(replyFileActionOkay, "DELE %s", path)
}

// Rename renames file "from" to "to".
func (c *Client) Rename(from, to string) error {
	pconn, err := c.getIdleConn()
	if err != nil {
		return err
	}

	defer c.returnConn(pconn)

	err = pconn.sendCommandExpected(replyFileActionPending, "RNFR %s", from)
	if err != nil {
		return err
	}

	return pconn.sendCommandExpected(replyFileActionOkay, "RNTO %s", to)
}

// Mkdir creates directory "path". The returned string is how the client
// should refer to the created directory.
func (c *Client) Mkdir(path string) (string, error) {
	pconn, err := c.getIdleConn()
	if err != nil {
		return "", err
	}

	defer c.returnConn(pconn)

	code, msg, err := pconn.sendCommand("MKD %s", path)
	if err != nil {
		return "", err
	}

	if code != replyDirCreated {
		return "", ftpError{code: code, msg: msg}
	}

	dir, err := extractDirName(msg)
	if err != nil {
		return "", err
	}

	return dir, nil
}

// Rmdir removes directory "path".
func (c *Client) Rmdir(path string) error {
	pconn, err := c.getIdleConn()
	if err != nil {
		return err
	}

	defer c.returnConn(pconn)

	return pconn.sendCommandExpected(replyFileActionOkay, "RMD %s", path)
}

// Getwd returns the current working directory.
func (c *Client) Getwd() (string, error) {
	pconn, err := c.getIdleConn()
	if err != nil {
		return "", err
	}

	defer c.returnConn(pconn)

	code, msg, err := pconn.sendCommand("PWD")
	if err != nil {
		return "", err
	}

	if code != replyDirCreated {
		return "", ftpError{code: code, msg: msg}
	}

	dir, err := extractDirName(msg)
	if err != nil {
		return "", err
	}

	return dir, nil
}

func commandNotSupporterdError(err error) bool {
	respCode := err.(ftpError).Code()
	return respCode == replyCommandSyntaxError || respCode == replyCommandNotImplemented
}

// ReadDir fetches the contents of a directory, returning a list of
// os.FileInfo's which are relatively easy to work with programatically. It
// will not return entries corresponding to the current directory or parent
// directories. The os.FileInfo's fields may be incomplete depending on what
// the server supports. If the server does not support "MLSD", "LIST" will
// be used. You may have to set ServerLocation in your config to get (more)
// accurate ModTimes in this case.
func (c *Client) ReadDir(path string) ([]os.FileInfo, error) {
	entries, err := c.dataStringList("MLSD %s", path)

	parser := parseMLST

	if err != nil {
		if !commandNotSupporterdError(err) {
			return nil, err
		}

		entries, err = c.dataStringList("LIST %s", path)
		if err != nil {
			return nil, err
		}
		parser = func(entry string, skipSelfParent bool) (os.FileInfo, error) {
			return parseLIST(entry, c.config.ServerLocation, skipSelfParent)
		}
	}

	var ret []os.FileInfo
	for _, entry := range entries {
		info, err := parser(entry, true)
		if err != nil {
			c.debug("error in ReadDir: %s", err)
			return nil, err
		}

		if info == nil {
			continue
		}

		ret = append(ret, info)
	}

	return ret, nil
}

// Stat fetches details for a particular file. The os.FileInfo's fields may
// be incomplete depending on what the server supports. If the server doesn't
// support "MLST", "LIST" will be attempted, but "LIST" will not work if path
// is a directory. You may have to set ServerLocation in your config to get
// (more) accurate ModTimes when using "LIST".
func (c *Client) Stat(path string) (os.FileInfo, error) {
	lines, err := c.controlStringList("MLST %s", path)
	if err != nil {
		if commandNotSupporterdError(err) {
			lines, err = c.dataStringList("LIST %s", path)
			if err != nil {
				return nil, err
			}

			if len(lines) != 1 {
				return nil, ftpError{err: fmt.Errorf("unexpected LIST response: %v", lines)}
			}

			return parseLIST(lines[0], c.config.ServerLocation, false)
		}
		return nil, err
	}

	if len(lines) != 3 {
		return nil, ftpError{err: fmt.Errorf("unexpected MLST response: %v", lines)}
	}

	return parseMLST(strings.TrimLeft(lines[1], " "), false)
}

func extractDirName(msg string) (string, error) {
	openQuote := strings.Index(msg, "\"")
	closeQuote := strings.LastIndex(msg, "\"")
	if openQuote == -1 || len(msg) == openQuote+1 || closeQuote <= openQuote {
		return "", ftpError{
			err: fmt.Errorf("failed parsing directory name: %s", msg),
		}
	}
	return strings.Replace(msg[openQuote+1:closeQuote], `""`, `"`, -1), nil
}

func (c *Client) controlStringList(f string, args ...interface{}) ([]string, error) {
	pconn, err := c.getIdleConn()
	if err != nil {
		return nil, err
	}

	defer c.returnConn(pconn)

	cmd := fmt.Sprintf(f, args...)

	code, msg, err := pconn.sendCommand(cmd)

	if !positiveCompletionReply(code) {
		pconn.debug("unexpected response to %s: %d-%s", cmd, code, msg)
		return nil, ftpError{code: code, msg: msg}
	}

	return strings.Split(msg, "\n"), nil
}

func (c *Client) dataStringList(f string, args ...interface{}) ([]string, error) {
	pconn, err := c.getIdleConn()
	if err != nil {
		return nil, err
	}

	defer c.returnConn(pconn)

	dcGetter, err := pconn.prepareDataConn()
	if err != nil {
		return nil, err
	}

	cmd := fmt.Sprintf(f, args...)

	err = pconn.sendCommandExpected(replyGroupPreliminaryReply, cmd)
	if err != nil {
		return nil, err
	}

	dc, err := dcGetter()
	if err != nil {
		return nil, err
	}

	// to catch early returns
	defer dc.Close()

	scanner := bufio.NewScanner(dc)
	scanner.Split(bufio.ScanLines)

	var res []string
	for scanner.Scan() {
		res = append(res, scanner.Text())
	}

	var dataError error
	if err = scanner.Err(); err != nil {
		pconn.debug("error reading %s data: %s", cmd, err)
		dataError = ftpError{
			err:       fmt.Errorf("error reading %s data: %s", cmd, err),
			temporary: true,
		}
	}

	err = dc.Close()
	if err != nil {
		pconn.debug("error closing data connection: %s", err)
	}

	code, msg, err := pconn.readResponse()
	if err != nil {
		return nil, err
	}

	if !positiveCompletionReply(code) {
		pconn.debug("unexpected result: %d-%s", code, msg)
		return nil, ftpError{code: code, msg: msg}
	}

	if dataError != nil {
		return nil, dataError
	}

	return res, nil
}

type ftpFile struct {
	name  string
	size  int64
	mode  os.FileMode
	mtime time.Time
	raw   string
}

func (f *ftpFile) Name() string {
	return f.name
}

func (f *ftpFile) Size() int64 {
	return f.size
}

func (f *ftpFile) Mode() os.FileMode {
	return f.mode
}

func (f *ftpFile) ModTime() time.Time {
	return f.mtime
}

func (f *ftpFile) IsDir() bool {
	return f.mode.IsDir()
}

func (f *ftpFile) Sys() interface{} {
	return f.raw
}

var lsRegex = regexp.MustCompile(`^\s*(\S)(\S{3})(\S{3})(\S{3})(?:\s+\S+){3}\s+(\d+)\s+(\w+\s+\d+)\s+([\d:]+)\s+(.+)$`)
var lsRegexMS = regexp.MustCompile(`^(\d+-\d+-\d+)\s+(\d+:\d+[^ ]+)\s+([^ ]+)\s+(.*)$`)

// total 404456
// drwxr-xr-x   8 goftp    20            272 Jul 28 05:03 git-ignored
// or
// 07-23-21     05:03PM    <DIR>         git-dir-ignored
// 07-23-21     05:03PM           272    git-ignored
func parseLIST(entry string, loc *time.Location, skipSelfParent bool) (os.FileInfo, error) {
	if strings.HasPrefix(entry, "total ") {
		return nil, nil
	}

	matches := lsRegex.FindStringSubmatch(entry)

	// on failure - try with MS format.
	if len(matches) == 0 {
		msmatches := lsRegexMS.FindStringSubmatch(entry)
		if len(msmatches) > 0 {
			// normalize MS to Unix based
			matches = make([]string, 10)
			matches[0] = entry
			if strings.ToUpper(msmatches[3]) == "<DIR>" {
				matches[1] = "d"
				matches[5] = "0"
			} else {
				matches[1] = "-"
				matches[5] = msmatches[3]
			}
			matches[2] = "rwx"
			matches[3] = "rwx"
			matches[4] = "rwx"
			if d, e := time.Parse("01-02-06", msmatches[1]); e == nil {
				matches[6] = d.Format("Jan _2")
			}
			if t, e := time.Parse("03:04pm", strings.ToLower(msmatches[2])); e == nil {
				matches[7] = t.Format("15:04")
			}
			matches[8] = msmatches[4]
		}
	}

	if len(matches) == 0 {
		return nil, ftpError{err: fmt.Errorf(`failed parsing LIST entry: %s`, entry)}
	}

	if skipSelfParent && (matches[8] == "." || matches[8] == "..") {
		return nil, nil
	}

	var mode os.FileMode
	switch matches[1] {
	case "d":
		mode |= os.ModeDir
	case "l":
		mode |= os.ModeSymlink
	}

	for i := 0; i < 3; i++ {
		if matches[i+2][0] == 'r' {
			mode |= os.FileMode(04 << (3 * uint(2-i)))
		}
		if matches[i+2][1] == 'w' {
			mode |= os.FileMode(02 << (3 * uint(2-i)))
		}
		if matches[i+2][2] == 'x' || matches[i+2][2] == 's' {
			mode |= os.FileMode(01 << (3 * uint(2-i)))
		}
	}

	size, err := strconv.ParseUint(matches[5], 10, 64)
	if err != nil {
		return nil, ftpError{err: fmt.Errorf(`failed parsing LIST entry's size: %s (%s)`, err, entry)}
	}

	var mtime time.Time
	if strings.Contains(matches[7], ":") {
		mtime, err = time.ParseInLocation("Jan _2 15:04", matches[6]+" "+matches[7], loc)
		if err == nil {
			now := time.Now()
			year := now.Year()
			if mtime.Month() > now.Month() {
				year--
			}
			mtime, err = time.ParseInLocation("Jan _2 15:04 2006", matches[6]+" "+matches[7]+" "+strconv.Itoa(year), loc)
		}
	} else {
		mtime, err = time.ParseInLocation("Jan _2 2006", matches[6]+" "+matches[7], loc)
	}

	if err != nil {
		return nil, ftpError{err: fmt.Errorf(`failed parsing LIST entry's mtime: %s (%s)`, err, entry)}
	}

	info := &ftpFile{
		name:  filepath.Base(matches[8]),
		mode:  mode,
		mtime: mtime,
		raw:   entry,
		size:  int64(size),
	}

	return info, nil
}

// an entry looks something like this:
// type=file;size=12;modify=20150216084148;UNIX.mode=0644;unique=1000004g1187ec7; lorem.txt
func parseMLST(entry string, skipSelfParent bool) (os.FileInfo, error) {
	parseError := ftpError{err: fmt.Errorf(`failed parsing MLST entry: %s`, entry)}
	incompleteError := ftpError{err: fmt.Errorf(`MLST entry incomplete: %s`, entry)}

	parts := strings.Split(entry, "; ")
	if len(parts) != 2 {
		return nil, parseError
	}

	facts := make(map[string]string)
	for _, factPair := range strings.Split(parts[0], ";") {
		factParts := strings.SplitN(factPair, "=", 2)
		if len(factParts) != 2 {
			return nil, parseError
		}
		facts[strings.ToLower(factParts[0])] = strings.ToLower(factParts[1])
	}

	typ := facts["type"]

	if typ == "" {
		return nil, incompleteError
	}

	if skipSelfParent && (typ == "cdir" || typ == "pdir" || typ == "." || typ == "..") {
		return nil, nil
	}

	var mode os.FileMode
	if facts["unix.mode"] != "" {
		m, err := strconv.ParseInt(facts["unix.mode"], 8, 32)
		if err != nil {
			return nil, parseError
		}
		mode = os.FileMode(m)
	} else if facts["perm"] != "" {
		// see http://tools.ietf.org/html/rfc3659#section-7.5.5
		for _, c := range facts["perm"] {
			switch c {
			case 'a', 'd', 'c', 'f', 'm', 'p', 'w':
				// these suggest you have write permissions
				mode |= 0200
			case 'l':
				// can list dir entries means readable and executable
				mode |= 0500
			case 'r':
				// readable file
				mode |= 0400
			}
		}
	} else {
		// no mode info, just say it's readable to us
		mode = 0400
	}

	if typ == "dir" || typ == "cdir" || typ == "pdir" {
		mode |= os.ModeDir
	} else if strings.HasPrefix(typ, "os.unix=slink") || strings.HasPrefix(typ, "os.unix=symlink") {
		// note: there is no general way to determine whether a symlink points to a dir or a file
		mode |= os.ModeSymlink
	}

	var (
		size int64
		err  error
	)

	if facts["size"] != "" {
		size, err = strconv.ParseInt(facts["size"], 10, 64)
	} else if mode.IsDir() && facts["sizd"] != "" {
		size, err = strconv.ParseInt(facts["sizd"], 10, 64)
	} else if facts["type"] == "file" {
		return nil, incompleteError
	}

	if err != nil {
		return nil, parseError
	}

	if facts["modify"] == "" {
		return nil, incompleteError
	}

	mtime, err := time.ParseInLocation(timeFormat, facts["modify"], time.UTC)
	if err != nil {
		return nil, incompleteError
	}

	info := &ftpFile{
		name:  filepath.Base(parts[1]),
		size:  size,
		mtime: mtime,
		raw:   entry,
		mode:  mode,
	}

	return info, nil
}
