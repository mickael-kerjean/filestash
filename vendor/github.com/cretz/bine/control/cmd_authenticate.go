package control

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"io/ioutil"
	"strings"
)

// Authenticate authenticates with the Tor instance using the "best" possible
// authentication method if not already authenticated and sets the Authenticated
// field. The password argument is optional, and will only be used if the
// "SAFECOOKIE" and "NULL" authentication methods are not available and
// "HASHEDPASSWORD" is.
func (c *Conn) Authenticate(password string) error {
	if c.Authenticated {
		return nil
	}
	// Determine the supported authentication methods, and the cookie path.
	pi, err := c.ProtocolInfo()
	if err != nil {
		return err
	}
	// Get the bytes to pass to with authenticate
	var authBytes []byte
	if pi.HasAuthMethod("NULL") {
		// No auth bytes
	} else if pi.HasAuthMethod("SAFECOOKIE") {
		if pi.CookieFile == "" {
			return c.protoErr("Invalid (empty) COOKIEFILE")
		}
		cookie, err := ioutil.ReadFile(pi.CookieFile)
		if err != nil {
			return c.protoErr("Failed to read COOKIEFILE: %v", err)
		} else if len(cookie) != 32 {
			return c.protoErr("Invalid cookie file length: %v", len(cookie))
		}

		// Send an AUTHCHALLENGE command, and parse the response.
		var clientNonce [32]byte
		if _, err := rand.Read(clientNonce[:]); err != nil {
			return c.protoErr("Failed to generate clientNonce: %v", err)
		}
		resp, err := c.SendRequest("AUTHCHALLENGE %s %s", "SAFECOOKIE", hex.EncodeToString(clientNonce[:]))
		if err != nil {
			return err
		}
		splitResp := strings.Split(resp.Reply, " ")
		if len(splitResp) != 3 || !strings.HasPrefix(splitResp[1], "SERVERHASH=") ||
			!strings.HasPrefix(splitResp[2], "SERVERNONCE=") {
			return c.protoErr("Invalid AUTHCHALLENGE response")
		}
		serverHash, err := hex.DecodeString(splitResp[1][11:])
		if err != nil {
			return c.protoErr("Failed to decode ServerHash: %v", err)
		}
		if len(serverHash) != 32 {
			return c.protoErr("Invalid ServerHash length: %d", len(serverHash))
		}
		serverNonce, err := hex.DecodeString(splitResp[2][12:])
		if err != nil {
			return c.protoErr("Failed to decode ServerNonce: %v", err)
		}
		if len(serverNonce) != 32 {
			return c.protoErr("Invalid ServerNonce length: %d", len(serverNonce))
		}

		// Validate the ServerHash.
		m := hmac.New(sha256.New, []byte("Tor safe cookie authentication server-to-controller hash"))
		m.Write(cookie)
		m.Write(clientNonce[:])
		m.Write(serverNonce)
		dervServerHash := m.Sum(nil)
		if !hmac.Equal(serverHash, dervServerHash) {
			return c.protoErr("invalid ServerHash: mismatch")
		}

		// Calculate the ClientHash, and issue the AUTHENTICATE.
		m = hmac.New(sha256.New, []byte("Tor safe cookie authentication controller-to-server hash"))
		m.Write(cookie)
		m.Write(clientNonce[:])
		m.Write(serverNonce)
		authBytes = m.Sum(nil)
	} else if pi.HasAuthMethod("HASHEDPASSWORD") {
		// Despite the name HASHEDPASSWORD, the raw password is actually sent. According to the code, this can either be
		// a QuotedString, or base16 encoded, so go with the later since it's easier to handle.
		if password == "" {
			return c.protoErr("password auth needs a password")
		}
		authBytes = []byte(password)
	} else {
		return c.protoErr("No supported authentication methods")
	}
	// Send it
	if err = c.sendAuthenticate(authBytes); err == nil {
		c.Authenticated = true
	}
	return err
}

func (c *Conn) sendAuthenticate(byts []byte) error {
	if len(byts) == 0 {
		return c.sendRequestIgnoreResponse("AUTHENTICATE")
	}
	return c.sendRequestIgnoreResponse("AUTHENTICATE %v", hex.EncodeToString(byts))
}
