PACKAGE_VERSION ?= 1.2.0
PACKAGE_URL = https://registry.npmjs.org/@qim3d/volume-explorer/-/volume-explorer-$(PACKAGE_VERSION).tgz
PLUGIN_NAME = application_volumeexplorer.zip
PLUGIN_DIST = ../../../dist/data/state/plugins
PLUGIN_LOCAL = ../../../state/plugins

all: clean setup build

clean:
	rm -rf app $(PLUGIN_NAME)

setup:
	mkdir -p app
	curl -L $(PACKAGE_URL) | tar -xzf - --strip-components=3 -C app package/dist/app

build:
	zip -r $(PLUGIN_NAME) manifest.json loader_tiff.js loader_tiff.css app

install: build
	mkdir -p $(PLUGIN_DIST)
	cp -f $(PLUGIN_NAME) $(PLUGIN_DIST)/

install-local: build
	mkdir -p $(PLUGIN_LOCAL)
	cp -f $(PLUGIN_NAME) $(PLUGIN_LOCAL)/
