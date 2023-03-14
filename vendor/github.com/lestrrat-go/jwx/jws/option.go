package jws

import (
	"github.com/lestrrat-go/option"
)

type Option = option.Interface

type identPayloadSigner struct{}
type identHeaders struct{}
type identMessage struct{}

func WithSigner(signer Signer, key interface{}, public, protected Headers) Option {
	return option.New(identPayloadSigner{}, &payloadSigner{
		signer:    signer,
		key:       key,
		protected: protected,
		public:    public,
	})
}

type SignOption interface {
	Option
	signOption()
}

type signOption struct {
	Option
}

func (*signOption) signOption() {}

// WithHeaders allows you to specify extra header values to include in the
// final JWS message
func WithHeaders(h Headers) SignOption {
	return &signOption{option.New(identHeaders{}, h)}
}

// VerifyOption describes an option that can be passed to the jws.Verify function
type VerifyOption interface {
	Option
	verifyOption()
}

type verifyOption struct {
	Option
}

func (*verifyOption) verifyOption() {}

// WithMessage can be passed to Verify() to obtain the jws.Message upon
// a successful verification.
func WithMessage(m *Message) VerifyOption {
	return &verifyOption{option.New(identMessage{}, m)}
}
