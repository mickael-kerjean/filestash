# goftp - an FTP client for golang

[![Build Status](https://travis-ci.org/secsy/goftp.svg)](https://travis-ci.org/secsy/goftp) [![GoDoc](https://godoc.org/github.com/secsy/goftp?status.svg)](https://godoc.org/github.com/secsy/goftp)

goftp aims to be a high-level FTP client that takes advantage of useful FTP features when supported by the server.

Here are some notable package highlights:

* Connection pooling for parallel transfers/traversal.
* Automatic resumption of interruped file transfers.
* Explicit and implicit FTPS support (TLS only, no SSL).
* IPv6 support.
* Reasonably good automated tests that run against pure-ftpd and proftpd.

Please see the godocs for details and examples.

Pull requests or feature requests are welcome, but in the case of the former, you better add tests.

### Tests ###

How to run tests (windows not supported):
* ```./build_test_server.sh``` from root goftp directory (this downloads and compiles pure-ftpd and proftpd)
* ```go test``` from the root goftp directory
