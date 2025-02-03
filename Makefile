all:
	make build_init
	make build_frontend
	make build_backend

clean: clean_frontend
	docker builder prune -f

build_init:
	go get ./...
	go generate -x ./server/...

build_frontend:
	make build_frontend_old
	cd public && make compress

build_frontend_old:
	NODE_ENV=production npm run build
	mkdir -p ./server/ctrl/static/www/canary/
	cp -R ./public/assets ./server/ctrl/static/www/canary/
	cp -R ./public/*.html ./server/ctrl/static/www/canary/

build_backend:
	CGO_ENABLED=1 CGO_LDFLAGS="-Wl,--copy-dt-needed-entries" go build --tags "fts5" -o dist/filestash cmd/main.go

build_backend_arm64:
	CGO_ENABLED=1 GOOS=linux GOARCH=arm GOARM=7 CC=arm-linux-gnueabihf-gcc go build -o dist/filestash cmd/main.go

build_backend_amd64:
	GOOS=linux CGO_ENABLED=1 GOARCH=amd64 CC=gcc go build -o dist/filestash cmd/main.go

clean_frontend:
	rm -rf server/ctrl/static/www/

.PHONY: docker

docker:
	docker build --tag filestash:alpine --file docker/local.Dockerfile .

run_docker:
	mkdir -p test
	chmod 777 test
	touch test/hello_world
	docker run --rm -it -v ./test:/test -p 8334:8334 filestash:alpine

test_docker: docker run_docker
