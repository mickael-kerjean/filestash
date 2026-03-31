all:
	make init
	make build

init:
	go get ./...
	go generate -x ./server/...

build:
	go build --tags "fts5" -o dist/filestash$(if $(filter windows,$(GOOS)),.exe) cmd/main.go
