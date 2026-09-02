RELEASE = target/wasm32-wasip1/release

all:
	$(MAKE) -C http
	$(MAKE) -C onInit
	$(MAKE) -C onChange
	$(MAKE) -C onQuit
	$(MAKE) -C socket
	$(MAKE) -C filesystem
	zip -j example.zip manifest.json \
		http/$(RELEASE)/endpoint.wasm \
		onInit/$(RELEASE)/oninit.wasm \
		onChange/$(RELEASE)/onchange.wasm \
		onQuit/$(RELEASE)/onquit.wasm \
		socket/$(RELEASE)/socket.wasm \
		filesystem/$(RELEASE)/filesystem.wasm
	mv example.zip ../../../dist/data/state/plugins/

init:
	rustup target add wasm32-wasip1
	$(MAKE) -C socket init

clean:
	$(MAKE) -C http clean
	$(MAKE) -C onInit clean
	$(MAKE) -C onChange clean
	$(MAKE) -C onQuit clean
	$(MAKE) -C socket clean
	$(MAKE) -C filesystem clean
