all:
	make init
	make build

init:
	go get ./...
	go generate -x ./server/...

build:
	CGO_ENABLED=1 go build --tags "fts5" -o dist/filestash cmd/main.go
