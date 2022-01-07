package httperr

// Note: The writer proxies in this file are a heavily modified version of
// code bearing the following message:
//
//   Copyright (c) 2014, 2015, 2016 Carl Jackson (carl@avtok.com)
//
//   MIT License
//
//   Permission is hereby granted, free of charge, to any person obtaining a copy of
//   this software and associated documentation files (the "Software"), to deal in
//   the Software without restriction, including without limitation the rights to
//   use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
//   the Software, and to permit persons to whom the Software is furnished to do so,
//   subject to the following conditions:
//
//   The above copyright notice and this permission notice shall be included in all
//   copies or substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
//   FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
//   COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
//   IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
//   CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import (
	"bufio"
	"bytes"
	"io/ioutil"
	"net"
	"net/http"
)

// wrapWriter wraps an http.ResponseWriter, returning a proxy that
// tracks the response.
func wrapWriter(w http.ResponseWriter) (*basicWriter, http.ResponseWriter) {
	_, isCloseNotifier := w.(http.CloseNotifier)
	_, isFlusher := w.(http.Flusher)
	_, isHijacker := w.(http.Hijacker)

	bw := basicWriter{ResponseWriter: w}
	if isCloseNotifier && isFlusher && isHijacker {
		rv := fancyWriter{bw}
		return &rv.basicWriter, &rv
	}
	if isFlusher {
		rv := flushWriter{bw}
		return &rv.basicWriter, &rv
	}
	return &bw, &bw
}

type basicWriter struct {
	http.ResponseWriter

	statusCode int
	copy       *http.Response
	body       *bytes.Buffer
}

func (b *basicWriter) WriteHeader(code int) {
	b.statusCode = code
	if code < 400 {
		b.ResponseWriter.WriteHeader(code)
		return
	}

	b.copy = &http.Response{
		StatusCode: code,
		Header:     b.ResponseWriter.Header(),
	}
}

func (b *basicWriter) Write(buf []byte) (int, error) {
	if b.copy == nil {
		return b.ResponseWriter.Write(buf)
	}

	if b.body == nil {
		b.body = &bytes.Buffer{}
		b.copy.Body = ioutil.NopCloser(b.body)
	}
	return b.body.Write(buf)
}

type fancyWriter struct {
	basicWriter
}

func (f *fancyWriter) CloseNotify() <-chan bool {
	cn := f.basicWriter.ResponseWriter.(http.CloseNotifier)
	return cn.CloseNotify()
}

func (f *fancyWriter) Flush() {
	fl := f.basicWriter.ResponseWriter.(http.Flusher)
	fl.Flush()
}

func (f *fancyWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hj := f.basicWriter.ResponseWriter.(http.Hijacker)
	return hj.Hijack()
}

var _ http.CloseNotifier = &fancyWriter{}
var _ http.Flusher = &fancyWriter{}
var _ http.Hijacker = &fancyWriter{}

type flushWriter struct {
	basicWriter
}

func (f *flushWriter) Flush() {
	fl := f.basicWriter.ResponseWriter.(http.Flusher)
	fl.Flush()
}

var _ http.Flusher = &flushWriter{}
