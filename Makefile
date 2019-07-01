.EXPORT_ALL_VARIABLES:

NODE_ENV = production
PKG_CONFIG_PATH = /usr/local/lib/pkgconfig/
CGO_CFLAGS_ALLOW = '-fopenmp'
GOPATH = /app

all:
	make build_backend

build_init:
	find ./src/plugin/plg_* -type f -name "install.sh" -exec {} \;
	find ./src/plugin/plg_* -type f -name '*.a' -exec mv {} /usr/local/lib/ \;
	go get -t ./src/...

build_frontend:
	npm run build

build_backend:
	go build --tags "fts5" -ldflags "-X github.com/BobCashStory/filestash/server/common.BUILD_NUMBER=`date -u +%Y%m%d`" -o ./dist/filestash main.go
