docker_dev:
	@docker rm -f nuage_dev || true 2> /dev/null
	@docker run -ti --net=host -v /home/mickael/Documents/projects/go/src/github.com/mickael-kerjean/nuage:/tmp/go/src/github.com/mickael-kerjean/nuage nuage_dev sh

docker_prd:
	docker build --no-cache -t machines/nuage docker/prod/
	docker push machines/nuage

build_frontend:
	NODE_ENV=production npm run build

build_backend:
	CGO_CFLAGS_ALLOW='-fopenmp' go build -o dist/nuage server/main.go
