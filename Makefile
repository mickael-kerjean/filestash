all:
	make build_backend

build_frontend:
	NODE_ENV=production npm run build

build_backend:
	PKG_CONFIG_PATH=/usr/local/lib/pkgconfig/ CGO_CFLAGS_ALLOW='-fopenmp' go build --tags "fts5" -ldflags "-X github.com/mickael-kerjean/filestash/server/common.BUILD_NUMBER=`date -u +%Y%m%d`" -o dist/filestash server/main.go

build_backend_reload:
	gin --bin dist/filestash-reload --path ./server/ --port 8333 --appPort 8334 run server/main.go

build_plugins:
	go build -buildmode=plugin -o ./dist/data/plugin/image.so server/plugin/plg_image_light/index.go
	go build -buildmode=plugin -o ./dist/data/plugin/backend_dav.so server/plugin/plg_backend_dav/index.go
	go build -buildmode=plugin -o ./dist/data/plugin/backend_ldap.so server/plugin/plg_backend_ldap/index.go
	go build -buildmode=plugin -o ./dist/data/plugin/backend_mysql.so server/plugin/plg_backend_mysql/index.go
	go build -buildmode=plugin -o dist/data/plugin/backend_backblaze.so server/plugin/plg_backend_backblaze/index.go
	go build -buildmode=plugin -o dist/data/plugin/security_scanner.so server/plugin/plg_security_scanner/index.go
