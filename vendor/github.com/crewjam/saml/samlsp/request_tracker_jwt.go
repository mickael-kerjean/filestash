package samlsp

import (
	"crypto/rsa"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4"

	"github.com/crewjam/saml"
)

var defaultJWTSigningMethod = jwt.SigningMethodRS256

// JWTTrackedRequestCodec encodes TrackedRequests as signed JWTs
type JWTTrackedRequestCodec struct {
	SigningMethod jwt.SigningMethod
	Audience      string
	Issuer        string
	MaxAge        time.Duration
	Key           *rsa.PrivateKey
}

var _ TrackedRequestCodec = JWTTrackedRequestCodec{}

// JWTTrackedRequestClaims represents the JWT claims for a tracked request.
type JWTTrackedRequestClaims struct {
	jwt.StandardClaims
	TrackedRequest
	SAMLAuthnRequest bool `json:"saml-authn-request"`
}

// Encode returns an encoded string representing the TrackedRequest.
func (s JWTTrackedRequestCodec) Encode(value TrackedRequest) (string, error) {
	now := saml.TimeNow()
	claims := JWTTrackedRequestClaims{
		StandardClaims: jwt.StandardClaims{
			Audience:  s.Audience,
			ExpiresAt: now.Add(s.MaxAge).Unix(),
			IssuedAt:  now.Unix(),
			Issuer:    s.Issuer,
			NotBefore: now.Unix(), // TODO(ross): correct for clock skew
			Subject:   value.Index,
		},
		TrackedRequest:   value,
		SAMLAuthnRequest: true,
	}
	token := jwt.NewWithClaims(s.SigningMethod, claims)
	return token.SignedString(s.Key)
}

// Decode returns a Tracked request from an encoded string.
func (s JWTTrackedRequestCodec) Decode(signed string) (*TrackedRequest, error) {
	parser := jwt.Parser{
		ValidMethods: []string{s.SigningMethod.Alg()},
	}
	claims := JWTTrackedRequestClaims{}
	_, err := parser.ParseWithClaims(signed, &claims, func(*jwt.Token) (interface{}, error) {
		return s.Key.Public(), nil
	})
	if err != nil {
		return nil, err
	}
	if !claims.VerifyAudience(s.Audience, true) {
		return nil, fmt.Errorf("expected audience %q, got %q", s.Audience, claims.Audience)
	}
	if !claims.VerifyIssuer(s.Issuer, true) {
		return nil, fmt.Errorf("expected issuer %q, got %q", s.Issuer, claims.Issuer)
	}
	if claims.SAMLAuthnRequest != true {
		return nil, fmt.Errorf("expected saml-authn-request")
	}
	claims.TrackedRequest.Index = claims.Subject
	return &claims.TrackedRequest, nil
}
