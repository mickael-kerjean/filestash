all:
	make build_backend

build_init:
	find server/plugin/plg_* -type f -name "install.sh" -exec {} \;
	go generate -x ./server/...

build_frontend:
	NODE_ENV=production npm run build

build_frontend_subfolder:
	NODE_ENV=production npm run build:subfolder

build_backend:
	PKG_CONFIG_PATH=/usr/local/lib/pkgconfig/ CGO_CFLAGS_ALLOW='-fopenmp' go build -mod=vendor --tags "fts5" -ldflags "-X github.com/mickael-kerjean/filestash/server/common.BUILD_DATE=`date -u +%Y%m%d` -X github.com/mickael-kerjean/filestash/server/common.BUILD_REF=`git rev-parse HEAD`" -o dist/filestash server/main.go
