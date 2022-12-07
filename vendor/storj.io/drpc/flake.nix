{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      with nixpkgs.legacyPackages.${system}; rec {
        defaultPackage = buildGoModule rec {
          name = "protoc-gen-go-drpc";
          src = builtins.path {
            path = ./.;
            name = "${name}-src";
            filter = (path: type: builtins.elem path (builtins.map toString [
              ./cmd
              ./cmd/protoc-gen-go-drpc
              ./cmd/protoc-gen-go-drpc/main.go
              ./go.mod
              ./go.sum
            ]));
          };
          subPackages = [ "cmd/protoc-gen-go-drpc" ];
          vendorSha256 = "sha256-3kIFjZDi2qnEDXDY0ozvylxJlBePkK7IPFOVipsfLBU=";
        };

        devShell =
          let devtools = {
            staticcheck = buildGoModule {
              name = "staticcheck";
              src = fetchFromGitHub {
                owner = "dominikh";
                repo = "go-tools";
                rev = "v0.2.0";
                sha256 = "sha256-QhTjzrERhbhCSkPzyLQwFyxrktNoGL9ris+XfE7n5nQ=";
              };
              doCheck = false;
              subPackages = [ "cmd/staticcheck" ];
              vendorSha256 = "sha256-EjCOMdeJ0whp2pHZvm4VV2K78UNKzl98Z/cQvGhWSyY=";
            };

            ci = buildGoModule {
              name = "ci";
              src = fetchFromGitHub {
                owner = "storj";
                repo = "ci";
                rev = "63f7574acdb97dd567c64537228d8582980ec301";
                sha256 = "sha256-AkrUZbS88BLc3dtWxYkecUNa29slwQ7/feT9+lPWO9g=";
              };
              doCheck = false;
              vendorSha256 = "sha256-6D452YbnkunAfD/M69VmwGDxENmVS72NKj92FTemJR0=";
              allowGoReference = true; # until check-imports stops needing this
              subPackages = [
                "check-copyright"
                "check-large-files"
                "check-imports"
                "check-atomic-align"
                "check-errs"
              ];
            };

            protoc-gen-go-grpc = buildGoModule {
              name = "protoc-gen-go-grpc";
              src = fetchFromGitHub {
                owner = "grpc";
                repo = "grpc-go";
                rev = "v1.36.0";
                sha256 = "sha256-sUDeWY/yMyijbKsXDBwBXLShXTAZ4445I4hpP7bTndQ=";
              };
              doCheck = false;
              vendorSha256 = "sha256-KHd9zmNsmXmc2+NNtTnw/CSkmGwcBVYNrpEUmIoZi5Q=";
              modRoot = "./cmd/protoc-gen-go-grpc";
            };

            protoc-gen-go = buildGoModule {
              name = "protoc-gen-go";
              src = fetchFromGitHub {
                owner = "protocolbuffers";
                repo = "protobuf-go";
                rev = "v1.27.1";
                sha256 = "sha256-wkUvMsoJP38KMD5b3Fz65R1cnpeTtDcVqgE7tNlZXys=";
              };
              doCheck = false;
              vendorSha256 = "sha256-pQpattmS9VmO3ZIQUFn66az8GSmB4IvYhTTCFn6SUmo=";
              modRoot = "./cmd/protoc-gen-go";
            };

            protoc-gen-twirp = buildGoPackage {
              name = "protoc-gen-twirp";
              src = fetchFromGitHub {
                owner = "twitchtv";
                repo = "twirp";
                rev = "v8.1.0";
                sha256 = "sha256-ezSNrDfOE1nj4FlX7E7Z7/eGfQw1B7NP34aj8ml5pDk=";
              };
              doCheck = false;
              goPackagePath = "github.com/twitchtv/twirp";
              subPackages = [ "./protoc-gen-twirp" ];
            };

            stringer = buildGoModule {
              name = "stringer";
              src = fetchFromGitHub {
                owner = "golang";
                repo = "tools";
                rev = "v0.1.4";
                sha256 = "sha256-7iQZvA6uUjZLP3/dxaM9y9jomSwEoaUgGclnciF8rh4=";
              };
              doCheck = false;
              vendorSha256 = "sha256-PRC59obp0ptooFuWhg2ruihEfJ0wKeMyT9xcLjoZyCo=";
              subPackages = [ "cmd/stringer" ];
            };

            godocdown = buildGoPackage {
              name = "godocdown";
              src = fetchFromGitHub {
                owner = "robertkrimen";
                repo = "godocdown";
                rev = "0bfa0490548148882a54c15fbc52a621a9f50cbe";
                sha256 = "sha256-5gGun9CTvI3VNsMudJ6zjrViy6Zk00NuJ4pZJbzY/Uk=";
              };
              doCheck = false;
              goPackagePath = "github.com/robertkrimen/godocdown";
              subPackages = [ "./godocdown" ];
            };
          };
        in mkShell {
            buildInputs = [
              defaultPackage

              go_1_17
              golangci-lint
              protobuf
              graphviz
              bash
              gnumake

              devtools.protoc-gen-go-grpc
              devtools.protoc-gen-go
              devtools.protoc-gen-twirp
              devtools.staticcheck
              devtools.ci
              devtools.stringer
              devtools.godocdown
            ];
          };
      }
    );
}
