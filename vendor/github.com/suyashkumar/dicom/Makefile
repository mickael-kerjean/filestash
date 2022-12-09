BINARY = dicomutil
VERSION = `git describe --tags --always`

.PHONY: build
build:
	go mod download
	$(MAKE) test
	go build -o build/${BINARY} ./cmd/dicomutil

.PHONY: build-fast
build-fast:
	go build -o build/${BINARY} ./cmd/dicomutil

.PHONY: build-debug
build-debug:
	go build -tags debug -o build/${BINARY} ./cmd/dicomutil

.PHONY: test
test:
	go test ./... -v

.PHONY: run
run:
	make build
	./${BINARY}

.PHONY: release
release:
	go mod download
	$(MAKE) test
	GOOS=linux GOARCH=amd64 go build -ldflags="-X 'main.GitVersion=${VERSION}'" -o build/${BINARY}-linux-amd64 ./cmd/dicomutil;
	GOOS=darwin GOARCH=amd64 go build -ldflags="-X 'main.GitVersion=${VERSION}'" -o build/${BINARY}-darwin-amd64 ./cmd/dicomutil;
	GOOS=windows GOARCH=amd64 go build -ldflags="-X 'main.GitVersion=${VERSION}'" -o build/${BINARY}-windows-amd64.exe ./cmd/dicomutil;
	cd build; \
	tar -zcvf ${BINARY}-linux-amd64.tar.gz ${BINARY}-linux-amd64; \
	tar -zcvf ${BINARY}-darwin-amd64.tar.gz ${BINARY}-darwin-amd64; \
	zip -r ${BINARY}-windows-amd64.exe.zip ${BINARY}-windows-amd64.exe;

bench-diff:
	go test -bench . -count 5 > bench_current.txt
	git checkout main
	go test -bench . -count 5 > bench_main.txt
	benchstat bench_main.txt bench_current.txt
	git checkout -
