.EXPORT_ALL_VARIABLES:

NODE_ENV = production
PKG_CONFIG_PATH = /usr/local/lib/pkgconfig/
CGO_CFLAGS_ALLOW = '-fopenmp'

all:
	make frontend_build
	make backend_download
	make backend_install_dep
	make backend_install
	make backend_bluid

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
	go build --tags "fts5" -ldflags "-X github.com/mickael-kerjean/filestash/src/common.BUILD_NUMBER=`date -u +%Y%m%d`" -o ./dist/filestash main.go
