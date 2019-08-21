export PKG_CONFIG_PATH = /usr/local/lib/pkgconfig/
export CGO_CFLAGS_ALLOW = '-fopenmp'

all:
	make backend_download
	make backend_install_dep
	make backend_install
	make backend_build

frontend_config:
	mkdir -p ./dist/data/state/
	cp -R config dist/data/state/config
	chmod -R o-r-w-x- ./dist/

frontend_install:
	npm install --silent

frontend_test:
	npm test

frontend_build:
	npm run build

backend_download:
	go get -d -v ./src/...

backend_install_dep:
	find ./src/plugin/plg_* -type f -name "install.sh" -exec {} \;
	find ./src/plugin/plg_* -type f -name '*.a' -exec mv {} /usr/local/lib/ \;

backend_install:
	go install -v ./src/...

backend_test:
	go get -t ../test/unit_go/...
	go test -v --tags "fts5" ../test/unit_go/...	

backend_build:
	go build --tags "fts5" -ldflags "-X github.com/mickael-kerjean/filestash/src/common.BUILD_DATE=`date -u +%Y%m%d` -X github.com/mickael-kerjean/filestash/src/common.BUILD_REF=`git rev-parse HEAD`" -o ./dist/filestash main.go