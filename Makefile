export NODE_ENV = production
export PKG_CONFIG_PATH = /usr/local/lib/pkgconfig/
export CGO_CFLAGS_ALLOW = '-fopenmp'

all:
	make backend_download
	make backend_install_dep
	make backend_install
	make backend_build

frontend_build:
	npm run build

backend_download:
	go get -d -v ./src/...

backend_install_dep:
	find ./src/plugin/plg_* -type f -name "install.sh" -exec {} \;
	find ./src/plugin/plg_* -type f -name '*.a' -exec mv {} /usr/local/lib/ \;


backend_install:
	go install -v ./src/...

backend_build:
	go build --tags "fts5" -ldflags "-X github.com/mickael-kerjean/filestash/server/common.BUILD_DATE=`date -u +%Y%m%d` -X github.com/mickael-kerjean/filestash/server/common.BUILD_REF=`git rev-parse HEAD`" -o dist/filestash server/main.go
