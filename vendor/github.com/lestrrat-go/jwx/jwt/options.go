package jwt

import (
	"time"

	"github.com/lestrrat-go/jwx/jwa"
	"github.com/lestrrat-go/jwx/jwe"
	"github.com/lestrrat-go/jwx/jwk"
	"github.com/lestrrat-go/jwx/jws"
	"github.com/lestrrat-go/option"
)

type Option = option.Interface

// GlobalOption describes an Option that can be passed to `Settings()`.
type GlobalOption interface {
	Option
	globalOption()
}

type globalOption struct {
	Option
}

func (*globalOption) globalOption() {}

// ParseRequestOption describes an Option that can be passed to `ParseRequest()`.
type ParseRequestOption interface {
	ParseOption
	httpParseOption()
}

type httpParseOption struct {
	ParseOption
}

func (*httpParseOption) httpParseOption() {}

// ParseOption describes an Option that can be passed to `Parse()`.
// ParseOption also implements ReadFileOption, therefore it may be
// safely pass them to `jwt.ReadFile()`
type ParseOption interface {
	ReadFileOption
	parseOption()
}

type parseOption struct {
	Option
}

func newParseOption(n interface{}, v interface{}) ParseOption {
	return &parseOption{option.New(n, v)}
}

func (*parseOption) parseOption()    {}
func (*parseOption) readFileOption() {}

// SignOption describes an Option that can be passed to Sign() or
// (jwt.Serializer).Sign
type SignOption interface {
	Option
	signOption()
}

type signOption struct {
	Option
}

func newSignOption(n interface{}, v interface{}) SignOption {
	return &signOption{option.New(n, v)}
}

func (*signOption) signOption() {}

// EncryptOption describes an Option that can be passed to Encrypt() or
// (jwt.Serializer).Encrypt
type EncryptOption interface {
	Option
	encryptOption()
}

type encryptOption struct {
	Option
}

func newEncryptOption(n interface{}, v interface{}) EncryptOption {
	return &encryptOption{option.New(n, v)}
}

func (*encryptOption) encryptOption() {}

// ValidateOption describes an Option that can be passed to Validate().
// ValidateOption also implements ParseOption, therefore it may be
// safely passed to `Parse()` (and thus `jwt.ReadFile()`)
type ValidateOption interface {
	ParseOption
	validateOption()
}

type validateOption struct {
	ParseOption
}

func newValidateOption(n interface{}, v interface{}) ValidateOption {
	return &validateOption{newParseOption(n, v)}
}

func (*validateOption) validateOption() {}

type identAcceptableSkew struct{}
type identAudience struct{}
type identClaim struct{}
type identClock struct{}
type identDecrypt struct{}
type identDefault struct{}
type identFlattenAudience struct{}
type identIssuer struct{}
type identJweHeaders struct{}
type identJwsHeaders struct{}
type identJwtid struct{}
type identKeySet struct{}
type identPedantic struct{}
type identRequiredClaim struct{}
type identSubject struct{}
type identTimeDelta struct{}
type identToken struct{}
type identTypedClaim struct{}
type identValidate struct{}
type identVerify struct{}

type identHeaderKey struct{}
type identFormKey struct{}

type VerifyParameters interface {
	Algorithm() jwa.SignatureAlgorithm
	Key() interface{}
}

type verifyParams struct {
	alg jwa.SignatureAlgorithm
	key interface{}
}

func (p *verifyParams) Algorithm() jwa.SignatureAlgorithm {
	return p.alg
}

func (p *verifyParams) Key() interface{} {
	return p.key
}

// WithVerify forces the Parse method to verify the JWT message
// using the given key. XXX Should have been named something like
// WithVerificationKey
func WithVerify(alg jwa.SignatureAlgorithm, key interface{}) ParseOption {
	return newParseOption(identVerify{}, &verifyParams{
		alg: alg,
		key: key,
	})
}

// WithKeySet forces the Parse method to verify the JWT message
// using one of the keys in the given key set. The key to be used
// is chosen by matching the Key ID of the JWT and the ID of the
// given keys.
//
// When using this option, keys MUST have a properly 'alg' field
// set. This is because we need to know the exact algorithm that
// you (the user) wants to use to verify the token. We do NOT
// trust the token's headers, because they can easily be tampered with.
func WithKeySet(set jwk.Set) ParseOption {
	return newParseOption(identKeySet{}, set)
}

// UseDefaultKey is used in conjunction with the option WithKeySet
// to instruct the Parse method to default to the single key in a key
// set when no Key ID is included in the JWT. If the key set contains
// multiple keys then the behaviour is unchanged.
func UseDefaultKey(value bool) ParseOption {
	return newParseOption(identDefault{}, value)
}

// WithToken specifies the token instance that is used when parsing
// JWT tokens.
func WithToken(t Token) ParseOption {
	return newParseOption(identToken{}, t)
}

// WithHeaders is passed to `jwt.Sign()` function, to allow specifying arbitrary
// header values to be included in the header section of the jws message
//
// This option will be deprecated in the next major version. Use
// jwt.WithJwsHeaders() instead.
func WithHeaders(hdrs jws.Headers) SignOption {
	return WithJwsHeaders(hdrs)
}

// WithJwsHeaders is passed to `jwt.Sign()` function or
// "jwt.Serializer".Sign() method, to allow specifying arbitrary
// header values to be included in the header section of the JWE message
func WithJwsHeaders(hdrs jws.Headers) SignOption {
	return newSignOption(identJwsHeaders{}, hdrs)
}

// WithJweHeaders is passed to "jwt.Serializer".Encrypt() method to allow
// specifying arbitrary header values to be included in the protected header
// of the JWE message
func WithJweHeaders(hdrs jwe.Headers) EncryptOption {
	return newEncryptOption(identJweHeaders{}, hdrs)
}

// WithValidate is passed to `Parse()` method to denote that the
// validation of the JWT token should be performed after a successful
// parsing of the incoming payload.
func WithValidate(b bool) ParseOption {
	return newParseOption(identValidate{}, b)
}

// WithClock specifies the `Clock` to be used when verifying
// claims exp and nbf.
func WithClock(c Clock) ValidateOption {
	return newValidateOption(identClock{}, c)
}

// WithAcceptableSkew specifies the duration in which exp and nbf
// claims may differ by. This value should be positive
func WithAcceptableSkew(dur time.Duration) ValidateOption {
	return newValidateOption(identAcceptableSkew{}, dur)
}

// WithIssuer specifies that expected issuer value. If not specified,
// the value of issuer is not verified at all.
func WithIssuer(s string) ValidateOption {
	return newValidateOption(identIssuer{}, s)
}

// WithSubject specifies that expected subject value. If not specified,
// the value of subject is not verified at all.
func WithSubject(s string) ValidateOption {
	return newValidateOption(identSubject{}, s)
}

// WithJwtID specifies that expected jti value. If not specified,
// the value of jti is not verified at all.
func WithJwtID(s string) ValidateOption {
	return newValidateOption(identJwtid{}, s)
}

// WithAudience specifies that expected audience value.
// `Validate()` will return true if one of the values in the `aud` element
// matches this value.  If not specified, the value of issuer is not
// verified at all.
func WithAudience(s string) ValidateOption {
	return newValidateOption(identAudience{}, s)
}

type claimValue struct {
	name  string
	value interface{}
}

// WithClaimValue specifies that expected any claim value.
func WithClaimValue(name string, v interface{}) ValidateOption {
	return newValidateOption(identClaim{}, claimValue{name, v})
}

// WithHeaderKey is used to specify header keys to search for tokens.
//
// While the type system allows this option to be passed to jwt.Parse() directly,
// doing so will have no effect. Only use it for HTTP request parsing functions
func WithHeaderKey(v string) ParseRequestOption {
	return &httpParseOption{newParseOption(identHeaderKey{}, v)}
}

// WithFormKey is used to specify header keys to search for tokens.
//
// While the type system allows this option to be passed to jwt.Parse() directly,
// doing so will have no effect. Only use it for HTTP request parsing functions
func WithFormKey(v string) ParseRequestOption {
	return &httpParseOption{newParseOption(identFormKey{}, v)}
}

// WithFlattenAudience specifies if the "aud" claim should be flattened
// to a single string upon the token being serialized to JSON.
//
// This is sometimes important when a JWT consumer does not understand that
// the "aud" claim can actually take the form of an array of strings.
//
// The default value is `false`, which means that "aud" claims are always
// rendered as a arrays of strings. This setting has a global effect,
// and will change the behavior for all JWT serialization.
func WithFlattenAudience(v bool) GlobalOption {
	return &globalOption{option.New(identFlattenAudience{}, v)}
}

type typedClaimPair struct {
	Name  string
	Value interface{}
}

// WithTypedClaim allows a private claim to be parsed into the object type of
// your choice. It works much like the RegisterCustomField, but the effect
// is only applicable to the jwt.Parse function call which receives this option.
//
// While this can be extremely useful, this option should be used with caution:
// There are many caveats that your entire team/user-base needs to be aware of,
// and therefore in general its use is discouraged. Only use it when you know
// what you are doing, and you document its use clearly for others.
//
// First and foremost, this is a "per-object" option. Meaning that given the same
// serialized format, it is possible to generate two objects whose internal
// representations may differ. That is, if you parse one _WITH_ the option,
// and the other _WITHOUT_, their internal representation may completely differ.
// This could potentially lead to problems.
//
// Second, specifying this option will slightly slow down the decoding process
// as it needs to consult multiple definitions sources (global and local), so
// be careful if you are decoding a large number of tokens, as the effects will stack up.
//
// Finally, this option will also NOT work unless the tokens themselves support such
// parsing mechanism. For example, while tokens obtained from `jwt.New()` and
// `openid.New()` will respect this option, if you provide your own custom
// token type, it will need to implement the TokenWithDecodeCtx interface.
func WithTypedClaim(name string, object interface{}) ParseOption {
	return newParseOption(identTypedClaim{}, typedClaimPair{Name: name, Value: object})
}

// WithRequiredClaim specifies that the claim identified the given name
// must exist in the token. Only the existence of the claim is checked:
// the actual value associated with that field is not checked.
func WithRequiredClaim(name string) ValidateOption {
	return newValidateOption(identRequiredClaim{}, name)
}

type delta struct {
	c1   string
	c2   string
	dur  time.Duration
	less bool // if true, d =< c1 - c2. otherwise d >= c1 - c2
}

// WithMaxDelta specifies that given two claims `c1` and `c2` that represent time, the difference in
// time.Duration must be less than equal to the value specified by `d`. If `c1` or `c2` is the
// empty string, the current time (as computed by `time.Now` or the object passed via
// `WithClock()`) is used for the comparison.
//
// `c1` and `c2` are also assumed to be required, therefore not providing either claim in the
// token will result in an error.
//
// Because there is no way of reliably knowing how to parse private claims, we currently only
// support `iat`, `exp`, and `nbf` claims.
//
// If the empty string is passed to c1 or c2, then the current time (as calculated by time.Now() or
// the clock object provided via WithClock()) is used.
//
// For example, in order to specify that `exp` - `iat` < 10*time.Second, you would write
//
//    jwt.Validate(token, jwt.WithMaxDelta(10*time.Second, jwt.ExpirationKey, jwt.IssuedAtKey))
//
// If AcceptableSkew of 2 second is specified, the above will return valid for any value of
// `exp` - `iat`  between 8 (10-2) and 12 (10+2).
func WithMaxDelta(dur time.Duration, c1, c2 string) ValidateOption {
	return newValidateOption(identTimeDelta{}, delta{
		c1:   c1,
		c2:   c2,
		dur:  dur,
		less: true,
	})
}

// WithMinDelta is almost exactly the same as WithMaxDelta, but force validation to fail if
// the difference between time claims are less than dur.
//
// For example, in order to specify that `exp` - `iat` > 10*time.Second, you would write
//
//    jwt.Validate(token, jwt.WithMinDelta(10*time.Second, jwt.ExpirationKey, jwt.IssuedAtKey))
//
func WithMinDelta(dur time.Duration, c1, c2 string) ValidateOption {
	return newValidateOption(identTimeDelta{}, delta{
		c1:   c1,
		c2:   c2,
		dur:  dur,
		less: false,
	})
}

type decryptParams struct {
	alg jwa.KeyEncryptionAlgorithm
	key interface{}
}

type DecryptParameters interface {
	Algorithm() jwa.KeyEncryptionAlgorithm
	Key() interface{}
}

func (dp *decryptParams) Algorithm() jwa.KeyEncryptionAlgorithm {
	return dp.alg
}

func (dp *decryptParams) Key() interface{} {
	return dp.key
}

// WithDecrypt allows users to specify parameters for decryption using
// `jwe.Decrypt`. You must specify this if your JWT is encrypted.
func WithDecrypt(alg jwa.KeyEncryptionAlgorithm, key interface{}) ParseOption {
	return newParseOption(identDecrypt{}, &decryptParams{
		alg: alg,
		key: key,
	})
}

// WithPedantic enables pedantic mode for parsing JWTs. Currently this only
// applies to checking for the correct `typ` and/or `cty` when necessary.
func WithPedantic(v bool) ParseOption {
	return newParseOption(identPedantic{}, v)
}
