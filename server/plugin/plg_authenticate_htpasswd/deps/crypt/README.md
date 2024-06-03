crypt
=====
A password hashing library.

The goal of crypt is to bring a library of many common and popular password
hashing algorithms to Go and to provide a simple and consistent interface to
each of them. As every hashing method is implemented in pure Go, this library
should be as portable as Go itself.

All hashing methods come with a test suite which verifies their operation
against itself as well as the output of other password hashing implementations
to ensure compatibility with them.

I hope you find this library to be useful and easy to use!

Note: forked from <https://github.com/jeramey/go-pwhash>

## Installation

	go get github.com/tredoe/osutil/user/crypt

## License

The source files are distributed under a BSD-style license that can be found
in the LICENSE file.
