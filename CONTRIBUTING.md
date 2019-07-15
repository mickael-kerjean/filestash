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
git clone https://github.com/mickael-kerjean/filestash
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


## Financial contributions

We also welcome financial contributions in full transparency on our [open collective](https://opencollective.com/filestash).
Anyone can file an expense. If the expense makes sense for the development of the community, it will be "merged" in the ledger of our open collective by the core contributors and the person who filed the expense will be reimbursed.

## Credits

### Code Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].
<a href="https://github.com/mickael-kerjean/filestash/graphs/contributors"><img src="https://opencollective.com/filestash/contributors.svg?width=890&button=false" /></a>

### Financial Contributors

Become a financial contributor and help us sustain our community. [[Contribute](https://opencollective.com/filestash/contribute)]

#### Individuals

<a href="https://opencollective.com/filestash"><img src="https://opencollective.com/filestash/individuals.svg?width=890"></a>

#### Organizations

Support this project with your organization. Your logo will show up here with a link to your website. [[Contribute](https://opencollective.com/filestash/contribute)]

<a href="https://opencollective.com/filestash/organization/0/website"><img src="https://opencollective.com/filestash/organization/0/avatar.svg"></a>
<a href="https://opencollective.com/filestash/organization/1/website"><img src="https://opencollective.com/filestash/organization/1/avatar.svg"></a>
<a href="https://opencollective.com/filestash/organization/2/website"><img src="https://opencollective.com/filestash/organization/2/avatar.svg"></a>
<a href="https://opencollective.com/filestash/organization/3/website"><img src="https://opencollective.com/filestash/organization/3/avatar.svg"></a>
<a href="https://opencollective.com/filestash/organization/4/website"><img src="https://opencollective.com/filestash/organization/4/avatar.svg"></a>
<a href="https://opencollective.com/filestash/organization/5/website"><img src="https://opencollective.com/filestash/organization/5/avatar.svg"></a>
<a href="https://opencollective.com/filestash/organization/6/website"><img src="https://opencollective.com/filestash/organization/6/avatar.svg"></a>
<a href="https://opencollective.com/filestash/organization/7/website"><img src="https://opencollective.com/filestash/organization/7/avatar.svg"></a>
<a href="https://opencollective.com/filestash/organization/8/website"><img src="https://opencollective.com/filestash/organization/8/avatar.svg"></a>
<a href="https://opencollective.com/filestash/organization/9/website"><img src="https://opencollective.com/filestash/organization/9/avatar.svg"></a>