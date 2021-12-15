# Contributing Guide

Thanks for taking the time to join our community and start contributing. This guide will help you get started with the Filestash project.

## How to contribute?

### Before you submit a pull request

For anything else than a typo or a bug fix, please raise an issue to discuss your proposal before submitting any code.

### License for contributions

As the copyright owner, you agree to license your contributions under an irrevocable MIT license.


### Building from source

*Prerequisites*: Git, Make, Node, Go, Glib 2.0

```
# Download the source
git clone https://github.com/mickael-kerjean/filestash
cd filestash

# Install dependencies
npm install # frontend dependencies
make build_init # install the required static libraries
mkdir -p ./dist/data/state/
cp -R config ./dist/data/state/

# Create the build
make build_frontend
make build_backend

# Run the program
./dist/filestash
```

### Building using Docker

You can build a docker image corresponding to local developments by running

    docker build -f docker/Dockerfile.dev .

The `docker/Dockerfile.dev` is oriented for the development compared to
`docker/Dockerfile`. it does not relies on prebuilt and released files, and it
is written in a way to minimise rebuilds upon changes. More specifically, it
uses dynamic linking for libtranscode and libresize, easier to build with a
stock debian image, but this means the image is larger because of the many
dependencies included.

### Tests
Our tests aren't open source. This comes as an attempt to restrict opportunistic forks (see [1](https://news.ycombinator.com/item?id=17006902#17009852) and [2](https://www.reddit.com/r/selfhosted/comments/a54axs/annoucing_jellyfin_a_free_software_fork_of_emby/ebk92iu/?utm_source=share&utm_medium=web2x)) from creating a stable release without serious commitment and splitting the community in pieces while I'm on holidays. Also the project welcome serious and willing maintainers.
