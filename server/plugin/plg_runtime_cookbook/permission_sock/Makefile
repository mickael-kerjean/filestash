all:
	cargo +nightly build --release -Zbuild-std=std,panic_abort --target wasm32-wasip1

init:
	rustup toolchain install nightly --component rust-src --target wasm32-wasip1
	cd "$$(rustc +nightly --print sysroot)/lib/rustlib/src/rust" && patch -p1 --forward -r - < $(CURDIR)/enable-network.patch || true

clean:
	rm -rf target
