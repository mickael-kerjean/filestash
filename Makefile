version=$(shell git describe --tags --always --dirty 2> /dev/null || git rev-parse --short HEAD)

all:
	make build_backend

build_init:
	find server/plugin/plg_* -type f -name "install.sh" -exec {} \;
	go generate -x ./server/...

build_frontend:
	NODE_ENV=production npm run build

build_backend:
	PKG_CONFIG_PATH=/usr/local/lib/pkgconfig/ CGO_CFLAGS_ALLOW='-fopenmp' go build $(GOFLAGS) -mod=vendor --tags "fts5" -ldflags " -X github.com/mickael-kerjean/filestash/server/common.APP_VERSION=${version} -X github.com/mickael-kerjean/filestash/server/common.BUILD_DATE=`date -u +%Y%m%d` -X github.com/mickael-kerjean/filestash/server/common.BUILD_REF=`git rev-parse HEAD`" -o dist/filestash server/main.go

registry?=
project=filestash
build_image:
	docker build --progress=plain \
		--build-arg VERSION=${version} \
		-t $(registry)$(project):$(version) \
		-f docker/Dockerfile.dev \
		.
	docker tag $(registry)$(project):$(version) $(registry)$(project):latest

publish_image:
	docker push $(registry)$(project):$(version)
	docker push $(registry)$(project):latest

_base_tag:=v0.5-$(shell date -u +%Y%m%d)
git_cur_tag:=$(shell git describe --tags --exact-match HEAD 2>/dev/null)
git_next_tag:=$(shell bash -c '_cur=$$(git tag -l "$(_base_tag)*" | sed -E 's/$(_base_tag)-?//' | sort -nr | head -n 1); echo $(_base_tag)-$$(expr $$([ -z "$$_cur" ] && echo 0 || echo $$_cur) + 1)')
git_is_master:=$(shell bash -c '[[ $$(git rev-list origin/master..HEAD) == "" ]] && echo yes')

tag_release:
ifeq ($(git_is_master), yes)
	@if [ -z "$(git_cur_tag)" ]; then \
		git tag -a -m "$(git_next_tag)" $(git_next_tag) HEAD; \
		git push origin refs/tags/$(git_next_tag):refs/tags/$(git_next_tag); \
		echo created tag $(git_next_tag); \
	else \
		echo HEAD already tagged as $(git_cur_tag) ;\
	fi;
else
	@echo Not on master, skipping tagging
endif
