# github.com/lestrrat-go/jwx ![](https://github.com/lestrrat-go/jwx/workflows/CI/badge.svg) [![Go Reference](https://pkg.go.dev/badge/github.com/lestrrat-go/jwx.svg)](https://pkg.go.dev/github.com/lestrrat-go/jwx) [![codecov.io](http://codecov.io/github/lestrrat-go/jwx/coverage.svg?branch=main)](http://codecov.io/github/lestrrat-go/jwx?branch=main)

Command line tool [jwx](./cmd/jwx) and libraries implementing various JWx technologies

| Package name                                              | Notes                                           |
|-----------------------------------------------------------|-------------------------------------------------|
| [jwt](https://github.com/lestrrat-go/jwx/tree/main/jwt) | [RFC 7519](https://tools.ietf.org/html/rfc7519) |
| [jwk](https://github.com/lestrrat-go/jwx/tree/main/jwk) | [RFC 7517](https://tools.ietf.org/html/rfc7517) + [RFC 7638](https://tools.ietf.org/html/rfc7638) |
| [jwa](https://github.com/lestrrat-go/jwx/tree/main/jwa) | [RFC 7518](https://tools.ietf.org/html/rfc7518) |
| [jws](https://github.com/lestrrat-go/jwx/tree/main/jws) | [RFC 7515](https://tools.ietf.org/html/rfc7515) |
| [jwe](https://github.com/lestrrat-go/jwx/tree/main/jwe) | [RFC 7516](https://tools.ietf.org/html/rfc7516) |

# Index

* [Documentation on pkg.go.dev](https://pkg.go.dev/github.com/lestrrat-go/jwx)
  * HTML version of what you can see using `go doc` command
* [How-to style documentation](./docs)
  * Frequently asked questions.
  * How to JWx That? Documentation by example.
* Overview of this package
  * Read on for more gory details.

# Description

## Why?

My goal was to write a server that heavily uses JWK and JWT. At first glance
the libraries that already exist seemed sufficient, but soon I realized that

1. To completely implement the protocols, I needed the entire JWT, JWK, JWS, JWE (and JWA, by necessity).
2. Most of the libraries that existed only deal with a subset of the various JWx specifications that were necessary to implement their specific needs

For example, a certain library looks like it had most of JWS, JWE, JWK covered, but then it lacked the ability to include private claims in its JWT responses. Another library had support of all the private claims, but completely lacked in its flexibility to generate various different response formats.

Because I was writing the server side (and the client side for testing), I needed the *entire* JOSE toolset to properly implement my server, **and** they needed to be *flexible* enough to fulfill the entire spec that I was writing.

So here's `github.com/lestrrat-go/jwx`. This library is extensible, customizable, and hopefully well organized to the point that it is easy for you to slice and dice it.

## Backwards Compatibility Notice

### Users of github.com/lestrrat/go-jwx

Uh, why are you using such an ancient version? You know that repository is archived for a reason, yeah? Please use the new version.

### Pre-1.0.0 users

The API has been reworked quite substantially between pre- and post 1.0.0 releases. Please check out the [Changes](./Changes) file (or the [diff](https://github.com/lestrrat-go/jwx/compare/v0.9.2...v1.0.0), if you are into that sort of thing)

### v1.0.x users

The API has gone under some changes for v1.1.0. If you are upgrading, you might want to read the relevant parts in the [Changes](./Changes) file.

# Command Line Tool

Since v1.1.1 we have a command line tool `jwx` (*). With `jwx` you can create JWKs (from PEM files, even), sign and verify JWS message, encrypt and decrypt JWE messages, etc.

(*) Okay, it existed since a long time ago, but it was never useful.

## Installation

```
go install github.com/lestrrat-go/jwx/cmd/jwx
```

# How-to style documentation

If you are looking for FAQs or want to look for ways to do X, you may have an easier time navigating through the [documentation here](./docs)

# Packages

## JWA [![Go Reference](https://pkg.go.dev/badge/github.com/lestrrat-go/jwx/jwa.svg)](https://pkg.go.dev/github.com/lestrrat-go/jwx/jwa)

Package [github.com/lestrrat-go/jwx/jwa](./jwa) defines the various algorithm described in [RFC7518](https://tools.ietf.org/html/rfc7518)

## JWT [![Go Reference](https://pkg.go.dev/badge/github.com/lestrrat-go/jwx/jwt.svg)](https://pkg.go.dev/github.com/lestrrat-go/jwx/jwt)

Package [github.com/lestrrat-go/jwx/jwt](./jwt) implements JSON Web Tokens as described in [RFC7519](https://tools.ietf.org/html/rfc7519).

* Convenience methods for oft-used keys ("aud", "sub", "iss", etc)
* Convenience functions to extract/parse from http.Request, http.Header, url.Values
* Ability to Get/Set arbitrary keys
* Conversion to and from JSON
* Generate signed tokens
* Verify signed tokens
* Extra support for OpenID tokens via [github.com/lestrrat-go/jwx/jwt/openid](./jwt/openid)

Examples are located in the examples directory ([jwt_example_test.go](./examples/jwt_example_test.go))

## JWK [![Go Reference](https://pkg.go.dev/badge/github.com/lestrrat-go/jwx/jwk.svg)](https://pkg.go.dev/github.com/lestrrat-go/jwx/jwk)

Package [github.com/lestrrat-go/jwx/jwk](./jwk) implements JWK as described in [RFC7517](https://tools.ietf.org/html/rfc7517)

* Parse and work with RSA/EC/Symmetric/OKP JWK types
  * Convert to and from JSON
  * Convert to and from raw key types (e.g. *rsa.PrivateKey)
* Ability to keep a JWKS fresh.
* Add arbitrary fields in the JWK object

Examples are located in the examples directory ([jwk_example_test.go](./examples/jwk_example_test.go))

Supported key types:

| kty | Curve                   | Go Key Type                                   |
|:----|:------------------------|:----------------------------------------------|
| RSA | N/A                     | rsa.PrivateKey / rsa.PublicKey (2)            |
| EC  | P-256<br>P-384<br>P-521<br>secp256k1 (1) | ecdsa.PrivateKey / ecdsa.PublicKey (2)        |
| oct | N/A                     | []byte                                        |
| OKP | Ed25519 (1)             | ed25519.PrivateKey / ed25519.PublicKey (2)    |
|     | X25519 (1)              | (jwx/)x25519.PrivateKey / x25519.PublicKey (2)|

* Note 1: Experimental
* Note 2: Either value or pointers accepted (e.g. rsa.PrivateKey or *rsa.PrivateKey)

## JWS [![Go Reference](https://pkg.go.dev/badge/github.com/lestrrat-go/jwx/jws.svg)](https://pkg.go.dev/github.com/lestrrat-go/jwx/jws)

Package [github.com/lestrrat-go/jwx/jws](./jws) implements JWS as described in [RFC7515](https://tools.ietf.org/html/rfc7515)

* Parse and generate compact or JSON serializations
* Sign and verify arbitrary payload
* Use any of the keys supported in [github.com/lestrrat-go/jwx/jwk](./jwk)
* Add arbitrary fields in the JWS object
* Ability to add/replace existing signature methods

Examples are located in the examples directory ([jws_example_test.go](./examples/jws_example_test.go))

Supported signature algorithms:

| Algorithm                               | Supported? | Constant in [jwa](./jwa) |
|:----------------------------------------|:-----------|:-------------------------|
| HMAC using SHA-256                      | YES        | jwa.HS256                |
| HMAC using SHA-384                      | YES        | jwa.HS384                |
| HMAC using SHA-512                      | YES        | jwa.HS512                |
| RSASSA-PKCS-v1.5 using SHA-256          | YES        | jwa.RS256                |
| RSASSA-PKCS-v1.5 using SHA-384          | YES        | jwa.RS384                |
| RSASSA-PKCS-v1.5 using SHA-512          | YES        | jwa.RS512                |
| ECDSA using P-256 and SHA-256           | YES        | jwa.ES256                |
| ECDSA using P-384 and SHA-384           | YES        | jwa.ES384                |
| ECDSA using P-521 and SHA-512           | YES        | jwa.ES512                |
| ECDSA using secp256k1 and SHA-256 (2)   | YES        | jwa.ES256K               |
| RSASSA-PSS using SHA256 and MGF1-SHA256 | YES        | jwa.PS256                |
| RSASSA-PSS using SHA384 and MGF1-SHA384 | YES        | jwa.PS384                |
| RSASSA-PSS using SHA512 and MGF1-SHA512 | YES        | jwa.PS512                |
| EdDSA (1)                               | YES        | jwa.EdDSA                |

* Note 1: Experimental
* Note 2: Experimental, and must be toggled using `-tags jwx_es256k` build tag

## JWE [![Go Reference](https://pkg.go.dev/badge/github.com/lestrrat-go/jwx/jwe.svg)](https://pkg.go.dev/github.com/lestrrat-go/jwx/jwe)

Package [github.com/lestrrast-go/jwx/jwe](./jwe) implements JWE as described in [RFC7516](https://tools.ietf.org/html/rfc7516)

* Encrypt and Decrypt arbitrary data
* Content compression and decompression
* Add arbitrary fields in the JWE header object

Examples are located in the examples directory ([jwe_example_test.go](./examples/jwe_example_test.go))

Supported key encryption algorithm:

| Algorithm                                | Supported? | Constant in [jwa](./jwa) |
|:-----------------------------------------|:-----------|:-------------------------|
| RSA-PKCS1v1.5                            | YES        | jwa.RSA1_5               |
| RSA-OAEP-SHA1                            | YES        | jwa.RSA_OAEP             |
| RSA-OAEP-SHA256                          | YES        | jwa.RSA_OAEP_256         |
| AES key wrap (128)                       | YES        | jwa.A128KW               |
| AES key wrap (192)                       | YES        | jwa.A192KW               |
| AES key wrap (256)                       | YES        | jwa.A256KW               |
| Direct encryption                        | YES (1)    | jwa.DIRECT               |
| ECDH-ES                                  | YES (1)    | jwa.ECDH_ES              |
| ECDH-ES + AES key wrap (128)             | YES        | jwa.ECDH_ES_A128KW       |
| ECDH-ES + AES key wrap (192)             | YES        | jwa.ECDH_ES_A192KW       |
| ECDH-ES + AES key wrap (256)             | YES        | jwa.ECDH_ES_A256KW       |
| AES-GCM key wrap (128)                   | YES        | jwa.A128GCMKW            |
| AES-GCM key wrap (192)                   | YES        | jwa.A192GCMKW            |
| AES-GCM key wrap (256)                   | YES        | jwa.A256GCMKW            |
| PBES2 + HMAC-SHA256 + AES key wrap (128) | YES        | jwa.PBES2_HS256_A128KW   |
| PBES2 + HMAC-SHA384 + AES key wrap (192) | YES        | jwa.PBES2_HS384_A192KW   |
| PBES2 + HMAC-SHA512 + AES key wrap (256) | YES        | jwa.PBES2_HS512_A256KW   |

* Note 1: Single-recipient only

Supported content encryption algorithm:

| Algorithm                   | Supported? | Constant in [jwa](./jwa) |
|:----------------------------|:-----------|:-------------------------|
| AES-CBC + HMAC-SHA256 (128) | YES        | jwa.A128CBC_HS256        |
| AES-CBC + HMAC-SHA384 (192) | YES        | jwa.A192CBC_HS384        |
| AES-CBC + HMAC-SHA512 (256) | YES        | jwa.A256CBC_HS512        |
| AES-GCM (128)               | YES        | jwa.A128GCM              |
| AES-GCM (192)               | YES        | jwa.A192GCM              |
| AES-GCM (256)               | YES        | jwa.A256GCM              |

# Global Settings

## Allowing single element in 'aud' field

When you marshal `"github.com/lestrrat-go/jwx/jwt".Token` into JSON, by default the `aud` field is serialized as an array of strings. This field may take either a single string or array form, but apparently there are parsers that do not understand the array form.

The examples below shoud both be valid, but apparently there are systems that do not understand the former ([AWS Cognito has been reported to be one such system](https://github.com/lestrrat-go/jwx/issues/368)).

```
{
  "aud": ["foo"],
  ...
}
```

```
{
  "aud": "foo",
  ...
}
```

To workaround these problematic parsers, you may use the `jwt.Settings()` function with the `jwt.WithFlattenAudience(true)` option.

```go
func init() {
  jwt.Settings(jwt.WithFlattenAudience(true))
}
```

The above call will force all calls to marshal JWT tokens to flatten the `aud` field when it can. This has global effect.

## Enabling ES256K

Some algorithms are intentionally left out because they are not as common in the wild, and you may want to avoid compiling this extra information in.
To enable these, you must explicitly provide a build tag.

| Algorithm        | Build Tag  |
|:-----------------|:-----------|
| secp256k1/ES256K | jwx_es256k |

If you do not provide these tags, the program will still compile, but it will return an error during runtime saying that these algorithms are not supported.

## Switching to a faster JSON library

By default we use the standard library's `encoding/json` for all of our JSON needs.
However, if performance for parsing/serializing JSON is really important to you, you might want to enable [github.com/goccy/go-json](https://github.com/goccy/go-json) by enabling the `jwx_goccy` tag.

```shell
% go build -tags jwx_goccy ...
```

[github.com/goccy/go-json](https://github.com/goccy/go-json) is *disabled* by default because it uses some really advanced black magic, and I really do not feel like debugging it **IF** it breaks. Please note that that's a big "if".
As of github.com/goccy/go-json@v0.3.3 I haven't see any problems, and I would say that it is mostly stable.

However, it is a dependency that you can go without, and I won't be of much help if it breaks -- therefore it is not the default.
If you know what you are doing, I highly recommend enabling this module -- all you need to do is to enable this tag.
Disable the tag if you feel like it's not worth the hassle.

And when you *do* enable [github.com/goccy/go-json](https://github.com/goccy/go-json) and you encounter some mysterious error, I also trust that you know to file an issue to [github.com/goccy/go-json](https://github.com/goccy/go-json) and **NOT** to this library.

## Using json.Number

If you want to parse numbers in the incoming JSON objects as json.Number
instead of floats, you can use the following call to globally affect the behavior of JSON parsing.

```go
func init() {
  jwx.DecoderSettings(jwx.WithUseNumber(true))
}
```

Do be aware that this has *global* effect. All code that calls in to `encoding/json`
within `jwx` *will* use your settings.

## Decode private fields to objects

Packages within `github.com/lestrrat-go/jwx` parses known fields into pre-defined types,
but for everything else (usually called private fields/headers/claims) are decoded into
wharever `"encoding/json".Unmarshal` deems appropriate.

For example, JSON objects are converted to `map[string]interface{}`, JSON arrays into
`[]interface{}`, and so on.

Sometimes you know beforehand that it makes sense for certain fields to be decoded into
proper objects instead of generic maps or arrays. When you encounter this, you can use
the `RegisterCustomField()` method in each of `jwe`, `jwk`, `jws`, and `jwt` packages.

```go
func init() {
  jwt.RegisterCustomField(`x-foo-bar`, mypkg.FooBar{})
}
```

This tells the decoder that when it encounters a JWT token with the field named
`"x-foo-bar"`, it should be decoded to an instance of `mypkg.FooBar`. Then you can
access this value by using `Get()`

```go
v, _ := token.Get(`x-foo-bar`)
foobar := v.(mypkg.FooBar)
```

Do be aware that this has *global* effect. In the above example, all JWT tokens containing
the `"x-foo-bar"` key will decode in the same way. If you need this behavior from
`jwe`, `jwk`, or `jws` packages, you need to do the same thing for each package.

# Other related libraries:

* https://github.com/dgrijalva/jwt-go
* https://github.com/square/go-jose
* https://github.com/coreos/go-oidc
* https://pkg.go.dev/golang.org/x/oauth2

# Contributions

## Issues

For bug reports and feature requests, please try to follow the issue templates as much as possible.
For either bug reports or feature requests, failing tests are even better.

## Pull Requests

Please make sure to include tests that excercise the changes you made.

## Discussions / Usage

Please try [discussions](https://github.com/lestrrat-go/jwx/discussions) first.

# Credits

* Work on this library was generously sponsored by HDE Inc (https://www.hde.co.jp)
* Lots of code, especially JWE was taken from go-jose library (https://github.com/square/go-jose)
* Lots of individual contributors have helped this project over the years. Thank each and everyone of you very much.

