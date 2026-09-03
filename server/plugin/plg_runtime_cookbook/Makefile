RELEASE = target/wasm32-wasip1/release

all:
	$(MAKE) -C http
	$(MAKE) -C onInit
	$(MAKE) -C onChange
	$(MAKE) -C onQuit
	$(MAKE) -C permission_sock
	$(MAKE) -C permission_fs
	$(MAKE) -C authorisation
	zip -j cookbook.zip manifest.json \
		http/$(RELEASE)/endpoint.wasm \
		onInit/$(RELEASE)/oninit.wasm \
		onChange/$(RELEASE)/onchange.wasm \
		onQuit/$(RELEASE)/onquit.wasm \
		permission_sock/$(RELEASE)/socket.wasm \
		permission_fs/$(RELEASE)/filesystem.wasm \
		authorisation/$(RELEASE)/authorisation.wasm
	mv cookbook.zip ../../../dist/data/state/plugins/

init:
	rustup target add wasm32-wasip1
	$(MAKE) -C permission_sock init

clean:
	$(MAKE) -C http clean
	$(MAKE) -C onInit clean
	$(MAKE) -C onChange clean
	$(MAKE) -C onQuit clean
	$(MAKE) -C permission_sock clean
	$(MAKE) -C permission_fs clean
	$(MAKE) -C authorisation clean
