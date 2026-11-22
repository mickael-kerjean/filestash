.PHONY: build setup install

FILESTASH_PATH ?= ../../../dist/data

build: setup
	npm run build

setup:
	npm ci

install: build
	mkdir -p "$(FILESTASH_PATH)/state/plugins"
	install -m 644 dist/editor_yfm.zip "$(FILESTASH_PATH)/state/plugins/"
