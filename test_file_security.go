//go:build ignore

package main

import (
	"bytes"
	"fmt"
	"io"
	"path/filepath"
	"regexp"
	"strings"
)

// Whitelist of allowed file extensions
var allowedExtensions = map[string]bool{
	".txt":  true,
	".csv":  true,
	".xls":  true,
	".xlsx": true,
	".zip":  true,
}

// File signatures (magic bytes) for content validation
var fileSignatures = map[string][]byte{
	".zip":  {0x50, 0x4B, 0x03, 0x04}, // PK..
	".xlsx": {0x50, 0x4B, 0x03, 0x04}, // XLSX is a ZIP file
	".xls":  {0xD0, 0xCF, 0x11, 0xE0}, // OLE2 format
}

// Regex for valid filename (alphanumeric, spaces, hyphens, underscores, dots)
var validFilenameRegex = regexp.MustCompile(`^[a-zA-Z0-9._\- ]+$`)

type TestError struct {
	message string
}

func (e *TestError) Error() string {
	return e.message
}

func NewError(msg string) error {
	return &TestError{message: msg}
}

// validateFileUpload validates the filename and extension
func validateFileUpload(path string) error {
	// Check for path traversal in the full path first
	if strings.Contains(path, "..") {
		return NewError("Invalid filename: path traversal detected")
	}
	
	filename := filepath.Base(path)

	// Check for path traversal attempts in filename
	if strings.Contains(filename, "//") {
		return NewError("Invalid filename: path traversal detected")
	}

	// Validate filename against normalcy pattern
	if !validFilenameRegex.MatchString(filename) {
		return NewError("Invalid filename: contains illegal characters")
	}

	// Check file extension against whitelist (if extension exists)
	ext := strings.ToLower(filepath.Ext(filename))
	if ext != "" && !allowedExtensions[ext] {
		return NewError("File type not allowed. Allowed types: txt, csv, xls, xlsx, zip (or no extension)")
	}

	return nil
}

// validateFileContent validates the file content matches its extension
func validateFileContent(path string, reader io.Reader) (io.Reader, error) {
	ext := strings.ToLower(filepath.Ext(path))

	// For text files (txt, csv) and files without extension, check for binary content
	if ext == ".txt" || ext == ".csv" || ext == "" {
		// Read first 512 bytes to check if it's text
		buf := make([]byte, 512)
		n, err := reader.Read(buf)
		if err != nil && err != io.EOF {
			return nil, NewError("Failed to read file content")
		}

		// Check if content appears to be text (no null bytes)
		for i := 0; i < n; i++ {
			if buf[i] == 0 {
				return nil, NewError("Invalid text file: contains binary data")
			}
		}

		// Return a reader that includes the already-read bytes
		return io.MultiReader(bytes.NewReader(buf[:n]), reader), nil
	}

	// For binary files (zip, xls, xlsx), check magic bytes
	if signature, exists := fileSignatures[ext]; exists {
		buf := make([]byte, len(signature))
		n, err := reader.Read(buf)
		if err != nil && err != io.EOF {
			return nil, NewError("Failed to read file content")
		}

		if n < len(signature) {
			return nil, NewError(fmt.Sprintf("Invalid %s file: file too small", ext))
		}

		// Check if magic bytes match
		for i := 0; i < len(signature); i++ {
			if buf[i] != signature[i] {
				return nil, NewError(fmt.Sprintf("Invalid %s file: content does not match file type", ext))
			}
		}

		// Return a reader that includes the already-read bytes
		return io.MultiReader(bytes.NewReader(buf[:n]), reader), nil
	}

	// If no specific validation, just return the reader
	return reader, nil
}

func main() {
	fmt.Println("=== File Upload Security Validation Tests ===\n")

	// Test cases for filename validation
	testCases := []struct {
		name        string
		path        string
		shouldError bool
	}{
		{"Valid TXT file", "/test/file.txt", false},
		{"Valid CSV file", "/test/data.csv", false},
		{"Valid XLSX file", "/test/spreadsheet.xlsx", false},
		{"Valid XLS file", "/test/spreadsheet.xls", false},
		{"Valid ZIP file", "/test/archive.zip", false},
		{"File without extension (README)", "/test/README", false},
		{"File without extension (Makefile)", "/test/Makefile", false},
		{"File without extension (.gitignore)", "/test/.gitignore", true},
		{"EICAR .com file (BLOCKED)", "/test/eicar.com", true},
		{"EXE file (BLOCKED)", "/test/malware.exe", true},
		{"SH script (BLOCKED)", "/test/script.sh", true},
		{"Path traversal (BLOCKED)", "/test/../../../etc/passwd", true},
		{"Invalid chars (BLOCKED)", "/test/file<script>.txt", true},
	}

	fmt.Println("1. Filename Validation Tests:")
	passed := 0
	failed := 0
	for _, tc := range testCases {
		err := validateFileUpload(tc.path)
		if tc.shouldError && err != nil {
			fmt.Printf("✓ PASS: %s - Correctly blocked: %s\n", tc.name, err.Error())
			passed++
		} else if !tc.shouldError && err == nil {
			fmt.Printf("✓ PASS: %s - Correctly allowed\n", tc.name)
			passed++
		} else if tc.shouldError && err == nil {
			fmt.Printf("✗ FAIL: %s - Should have been blocked but was allowed\n", tc.name)
			failed++
		} else {
			fmt.Printf("✗ FAIL: %s - Should have been allowed but was blocked: %s\n", tc.name, err.Error())
			failed++
		}
	}

	fmt.Printf("\nFilename Validation: %d passed, %d failed\n\n", passed, failed)

	// Test cases for content validation
	contentTests := []struct {
		name        string
		path        string
		content     []byte
		shouldError bool
	}{
		{"Valid text file", "/test/file.txt", []byte("This is valid text"), false},
		{"Valid CSV file", "/test/data.csv", []byte("name,age\nJohn,30"), false},
		{"Valid file without extension", "/test/README", []byte("# README\nThis is a readme file"), false},
		{"Valid Unicode text (UTF-8)", "/test/unicode.txt", []byte("Hello 世界 🌍 Привет مرحبا"), false},
		{"Valid Unicode CSV", "/test/data.csv", []byte("名前,年齢\n太郎,30\n花子,25"), false},
		{"Text with null byte (BLOCKED)", "/test/binary.txt", []byte("Text\x00null"), true},
		{"Valid ZIP file", "/test/archive.zip", []byte{0x50, 0x4B, 0x03, 0x04, 0x14, 0x00}, false},
		{"Fake ZIP (BLOCKED)", "/test/fake.zip", []byte{0x00, 0x00, 0x00, 0x00}, true},
		{"Valid XLS file", "/test/spreadsheet.xls", []byte{0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1}, false},
		{"Fake XLS (BLOCKED)", "/test/fake.xls", []byte{0x00, 0x00, 0x00, 0x00}, true},
	}

	fmt.Println("2. Content Validation Tests:")
	passed = 0
	failed = 0
	for _, tc := range contentTests {
		reader := bytes.NewReader(tc.content)
		_, err := validateFileContent(tc.path, reader)
		if tc.shouldError && err != nil {
			fmt.Printf("✓ PASS: %s - Correctly blocked: %s\n", tc.name, err.Error())
			passed++
		} else if !tc.shouldError && err == nil {
			fmt.Printf("✓ PASS: %s - Correctly allowed\n", tc.name)
			passed++
		} else if tc.shouldError && err == nil {
			fmt.Printf("✗ FAIL: %s - Should have been blocked but was allowed\n", tc.name)
			failed++
		} else {
			fmt.Printf("✗ FAIL: %s - Should have been allowed but was blocked: %s\n", tc.name, err.Error())
			failed++
		}
	}

	fmt.Printf("\nContent Validation: %d passed, %d failed\n\n", passed, failed)

	// EICAR specific test
	fmt.Println("3. EICAR Test File Protection:")
	eicarErr := validateFileUpload("/test/eicar.com")
	if eicarErr != nil {
		fmt.Printf("✓ PASS: EICAR file blocked by extension whitelist: %s\n", eicarErr.Error())
	} else {
		fmt.Println("✗ FAIL: EICAR file was not blocked!")
	}

	fmt.Println("\n=== Summary ===")
	fmt.Println("File upload security measures implemented:")
	fmt.Println("1. ✓ Extension whitelist (txt, csv, xls, xlsx, zip, or no extension)")
	fmt.Println("2. ✓ Content validation (magic bytes for binary files, null byte check for text)")
	fmt.Println("3. ✓ Filename sanitization (path traversal protection)")
	fmt.Println("4. ✓ Character validation (prevents XSS in filenames)")
	fmt.Println("5. ✓ Files without extensions allowed (README, Makefile, etc.)")
}
