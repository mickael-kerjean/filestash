package torutil

import (
	"fmt"
	"strings"
)

// PartitionString returns the two parts of a string delimited by the first
// occurrence of ch. If ch does not exist, the second string is empty and the
// resulting bool is false. Otherwise it is true.
func PartitionString(str string, ch byte) (string, string, bool) {
	index := strings.IndexByte(str, ch)
	if index == -1 {
		return str, "", false
	}
	return str[:index], str[index+1:], true
}

// PartitionStringFromEnd is same as PartitionString except it delimts by the
// last occurrence of ch instead of the first.
func PartitionStringFromEnd(str string, ch byte) (string, string, bool) {
	index := strings.LastIndexByte(str, ch)
	if index == -1 {
		return str, "", false
	}
	return str[:index], str[index+1:], true
}

// EscapeSimpleQuotedStringIfNeeded calls EscapeSimpleQuotedString only if the
// string contains a space, backslash, double quote, newline, or carriage return
// character.
func EscapeSimpleQuotedStringIfNeeded(str string) string {
	if strings.ContainsAny(str, " \\\"\r\n") {
		return EscapeSimpleQuotedString(str)
	}
	return str
}

var simpleQuotedStringEscapeReplacer = strings.NewReplacer(
	"\\", "\\\\",
	"\"", "\\\"",
	"\r", "\\r",
	"\n", "\\n",
)

// EscapeSimpleQuotedString calls EscapeSimpleQuotedStringContents and then
// surrounds the entire string with double quotes.
func EscapeSimpleQuotedString(str string) string {
	return "\"" + EscapeSimpleQuotedStringContents(str) + "\""
}

// EscapeSimpleQuotedStringContents escapes backslashes, double quotes,
// newlines, and carriage returns in str.
func EscapeSimpleQuotedStringContents(str string) string {
	return simpleQuotedStringEscapeReplacer.Replace(str)
}

// UnescapeSimpleQuotedStringIfNeeded calls UnescapeSimpleQuotedString only if
// str is surrounded with double quotes.
func UnescapeSimpleQuotedStringIfNeeded(str string) (string, error) {
	if len(str) >= 2 && str[0] == '"' && str[len(str)-1] == '"' {
		return UnescapeSimpleQuotedString(str)
	}
	return str, nil
}

// UnescapeSimpleQuotedString removes surrounding double quotes and calls
// UnescapeSimpleQuotedStringContents.
func UnescapeSimpleQuotedString(str string) (string, error) {
	if len(str) < 2 || str[0] != '"' || str[len(str)-1] != '"' {
		return "", fmt.Errorf("Missing quotes")
	}
	return UnescapeSimpleQuotedStringContents(str[1 : len(str)-1])
}

// UnescapeSimpleQuotedStringContents unescapes backslashes, double quotes,
// newlines, and carriage returns. Also errors if those aren't escaped.
func UnescapeSimpleQuotedStringContents(str string) (string, error) {
	ret := ""
	escaping := false
	for _, c := range str {
		switch c {
		case '\\':
			if escaping {
				ret += "\\"
			}
			escaping = !escaping
		case '"':
			if !escaping {
				return "", fmt.Errorf("Unescaped quote")
			}
			ret += "\""
			escaping = false
		case '\r', '\n':
			return "", fmt.Errorf("Unescaped newline or carriage return")
		default:
			if escaping {
				if c == 'r' {
					ret += "\r"
				} else if c == 'n' {
					ret += "\n"
				} else {
					return "", fmt.Errorf("Unexpected escape")
				}
			} else {
				ret += string(c)
			}
			escaping = false
		}
	}
	return ret, nil
}
