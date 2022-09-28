module modernc.org/sqlite

go 1.17

require (
	github.com/mattn/go-sqlite3 v1.14.15
	golang.org/x/sys v0.0.0-20220811171246-fbc7d0a398ab
	modernc.org/ccgo/v3 v3.16.9
	modernc.org/libc v1.19.0
	modernc.org/mathutil v1.5.0
	modernc.org/tcl v1.14.0
)

require (
	github.com/google/uuid v1.3.0 // indirect
	github.com/kballard/go-shellquote v0.0.0-20180428030007-95032a82bc51 // indirect
	github.com/mattn/go-isatty v0.0.16 // indirect
	github.com/remyoudompheng/bigfft v0.0.0-20200410134404-eec4a21b6bb0 // indirect
	golang.org/x/mod v0.3.0 // indirect
	golang.org/x/tools v0.0.0-20201124115921-2c860bdd6e78 // indirect
	golang.org/x/xerrors v0.0.0-20200804184101-5ec99f83aff1 // indirect
	lukechampine.com/uint128 v1.1.1 // indirect
	modernc.org/cc/v3 v3.38.1 // indirect
	modernc.org/httpfs v1.0.6 // indirect
	modernc.org/memory v1.4.0 // indirect
	modernc.org/opt v0.1.3 // indirect
	modernc.org/strutil v1.1.3 // indirect
	modernc.org/token v1.0.1 // indirect
	modernc.org/z v1.6.0 // indirect
)

retract [v1.16.0, v1.17.2] // https://gitlab.com/cznic/sqlite/-/issues/100

retract v1.19.0 // module source tree too large (max size is 524288000 bytes)
