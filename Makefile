all:
	make build_init
	make build_frontend
	GOARCH=amd64 GOOS=linux make build_backend
	# GOARCH=arm GOARM=7 GOOS=linux make build_backend

build_init:
	go generate -x ./server/...

build_frontend:
	NODE_ENV=production npm run build

build_backend:
	CGO_ENABLED=0 go build -ldflags="-extldflags=-static" -mod=vendor --tags "fts5" -o dist/filestash server/main.go

clean_frontend:
	rm -rf server/ctrl/static/www/
