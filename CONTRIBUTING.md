# Contributing Guide

Thanks for taking the time to join our community and start contributing. This guide will help you get started with the Filestash project.

## How to contribute?

### Before you submit a pull request

For anything else than a typo or an obvious bug fix, please raise an issue to discuss your proposal before submitting any code.

### License for contributions

As the copyright owner, you agree to license your contributions under an irrevocable MIT license.


## Building from source

### Prerequisites
- Git
- Make
- Node
- Go

### Download the source
```
export $GOPATH=/wherever/you/want
cd $GOPATH
mkdir -p github.com/mickael-kerjean/ && cd github.com/mickael-kerjean/
git clone https://github.com/BobCashStory/filestash
cd filestash
```

### Install dependencies
```
# frontend dependencies
npm install

# backend dependencies
go get ./server/...
make build_init # beware this will install the required C headers under /usr/local/include/
```

### Building
*Frontend*:
```
# Production build:
make build_frontend

# Development build:
npm run dev
```

*Backend*:
```
make build_backend
```

*Run*:
```
./dist/filestash
```

*Clear*:
```
# clear the frontend
rm -rf ./dist/data/public/
# clear the entire build
rm -rf ./dist
```

### Tests
Our tests aren't open source. This comes as an attempt to restrict opportunistic forks (see [1](https://news.ycombinator.com/item?id=17006902#17009852) and [2](https://www.reddit.com/r/selfhosted/comments/a54axs/annoucing_jellyfin_a_free_software_fork_of_emby/ebk92iu/?utm_source=share&utm_medium=web2x)) from creating a stable release without serious commitment and splitting the community in pieces while I'm on holidays. Also the project welcome serious and willing maintainers.
