package rgbterm

import (
	"bufio"
	"bytes"
	"io"
	"os"
	"regexp"
	"strconv"
	"strings"
)

// MaxEscapeCodeLen is the maximum number of bytes that the contents of an escape
// code may be. If the escape code is longer than this, it is output verbatim
// without being replaced. If MaxEscapeCodeLen is set to 0 escape codes may be
// any length (checking is not performed)
//
// This is used to avoid a possible denial of service.
var MaxEscapeCodeLen uint = 15

// interpret reads from r and writes to w. While reading any color escape codes detected
// are replaced by the result of calling subst with the escape code.
func interpret(r io.ByteReader, w io.Writer, subst func(s string) []byte) (err error) {
	inEscape := false
	escape := &bytes.Buffer{}
	out := bufio.NewWriter(w)
	defer func() {
		if err == nil {
			err = out.Flush()
		}
	}()

	for {
		var c byte
		c, err = r.ReadByte()
		if err != nil {
			// EOF. Don't consider this a failure of interpret()
			err = nil
			break
		}

		if inEscape {
			if rune(c) == '{' && escape.Len() == 0 {
				// False alarm: this was the sequence {{ which means the user wanted to
				// output {.
				_, err = out.Write([]byte("{"))
				escape.Reset()
				inEscape = false
			} else if rune(c) == '}' {
				_, err = out.Write(subst(escape.String()))
				escape.Reset()
				inEscape = false
			} else {
				escape.WriteByte(c)
				if MaxEscapeCodeLen > 0 && uint(escape.Len()) > MaxEscapeCodeLen {
					// Escape code too long
					out.Write([]byte("{"))
					_, err = out.Write(escape.Bytes())
					inEscape = false
				}
			}
		} else {
			if rune(c) == '{' {
				inEscape = true
			} else {
				_, err = out.Write([]byte{c})
			}
		}

		if err != nil {
			// Write error occurred
			return
		}
	}

	return
}

// colorRegex matches color escape codes
var colorRegex *regexp.Regexp = regexp.MustCompile(`#([[:xdigit:]]{2})([[:xdigit:]]{2})([[:xdigit:]]{2})`)

func parseEscape(s string) ([]uint8, []uint8) {
	parts := strings.Split(s, ",")

	atoi := func(s []string) (r []uint8) {
		r = make([]uint8, len(s))
		for i, v := range s {
			i64, _ := strconv.ParseInt(v, 16, 0)
			r[i] = uint8(i64)
		}
		return
	}

	escapes := make([][]uint8, 2)
	for i, p := range parts {
		match := colorRegex.FindStringSubmatch(p)
		if match != nil {
			escapes[i] = atoi(match[1:])
		}
	}

	return escapes[0], escapes[1]
}

func substColor(s string) (c []byte) {
	fg, bg := parseEscape(s)

	if fg == nil && bg == nil {
		// Reset colors to default
		return reset
	}

	if fg != nil {
		c = append(c, color(fg[0], fg[1], fg[2], true)...)
	}
	if bg != nil {
		if len(c) > 0 {
			c = append(c, byte(';'))
		}

		c = append(c, color(bg[0], bg[1], bg[2], false)...)
	}

	c = append(before, c...)
	c = append(c, after...)

	return
}

// Interpret reads data from r and writes it to w,
// while substituting the color escapes in the input.
//
// Color escapes are directives having one of forms
// on the following lines:
//
//   {#RRGGBB}
//   {#RRGGBB,#RRGGBB}
//   {,#RRGGBB}
//   {}
//
// The first form sets the terminal foreground color to
// the color RR,GG,BB where RR is the red component,
// GG green and BB blue. Each component is in hex.
//
// The second form sets the foreground and background
// colors, while the third sets only the background.
//
// The fourth form resets the terminal colors to defaults.
//
// To output a literal { character, use two braces: {{.
func Interpret(r io.ByteReader, w io.Writer) error {
	return interpret(r, w, substColor)
}

// ColorizeTemplate substitutes the color escapes in the
// string s and returns the resulting string.
//
// See Interpret for a description of color escapes.
func InterpretStr(s string) string {
	var out bytes.Buffer
	Interpret(bytes.NewBuffer([]byte(s)), &out)
	return out.String()
}

// ColorTemplateWriter writes to an underlying io.Writer
// while substituting the color escapes in the input.
//
// See Interpret for a description of color escapes.
type InterpretingWriter struct {
	p *io.PipeWriter
}

// NewColorTemplateWriter creates a ColorTemplateWriter that writes to
// w while substituting the color escapes in the input.
//
// See Interpret for a description of color escapes.
func NewInterpretingWriter(w io.Writer) InterpretingWriter {
	pr, pw := io.Pipe()

	go Interpret(bufio.NewReader(pr), w)

	return InterpretingWriter{p: pw}
}

// Write writes to the underlying io.Writer while substituting the
// color escapes in the input.
//
// See Interpret for a description of color escapes.
func (tw InterpretingWriter) Write(p []byte) (n int, err error) {
	return tw.p.Write(p)
}

var (
	// ColorOut is a io.Writer that writes to os.Stdout
	// while substituting the the color escapes in it's input.
	//
	// See Interpret for a description of color escapes.
	ColorOut io.Writer = NewInterpretingWriter(os.Stdout)
	// ColorErr is a io.Writer that writes to os.Stderr
	// while substituting the the color escapes in it's input.
	//
	// See Interpret for a description of color escapes.
	ColorErr io.Writer = NewInterpretingWriter(os.Stderr)
)
