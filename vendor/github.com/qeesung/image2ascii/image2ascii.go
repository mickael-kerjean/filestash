package main

import (
	"errors"
	"flag"
	"fmt"
	"github.com/qeesung/image2ascii/convert"
	_ "image/jpeg"
	_ "image/png"
	"os"
)

var imageFilename string
var ratio float64
var fixedWidth int
var fixedHeight int
var fitScreen bool
var stretchedScreen bool
var colored bool
var reversed bool

var convertDefaultOptions = convert.DefaultOptions

func init() {
	flag.StringVar(&imageFilename,
		"f",
		"",
		"Image filename to be convert")
	flag.Float64Var(&ratio,
		"r",
		convertDefaultOptions.Ratio,
		"Ratio to scale the image, ignored when use -w or -g")
	flag.IntVar(&fixedWidth,
		"w",
		convertDefaultOptions.FixedWidth,
		"Expected image width, -1 for image default width")
	flag.IntVar(&fixedHeight,
		"g",
		convertDefaultOptions.FixedHeight,
		"Expected image height, -1 for image default height")
	flag.BoolVar(&fitScreen,
		"s",
		convertDefaultOptions.FitScreen,
		"Fit the terminal screen, ignored when use -w, -g, -r")
	flag.BoolVar(&colored,
		"c",
		convertDefaultOptions.Colored,
		"Colored the ascii when output to the terminal")
	flag.BoolVar(&reversed,
		"i",
		convertDefaultOptions.Reversed,
		"Reversed the ascii when output to the terminal")
	flag.BoolVar(&stretchedScreen,
		"t",
		convertDefaultOptions.StretchedScreen,
		"Stretch the picture to overspread the screen")
	flag.Usage = usage
}

func main() {
	flag.Parse()
	if convertOptions, err := parseOptions(); err == nil {
		converter := convert.NewImageConverter()
		fmt.Print(converter.ImageFile2ASCIIString(imageFilename, convertOptions))
	} else {
		usage()
	}
}

func parseOptions() (*convert.Options, error) {
	if imageFilename == "" {
		return nil, errors.New("image file should not be empty")
	}
	// config  the options
	convertOptions := &convert.Options{
		Ratio:           ratio,
		FixedWidth:      fixedWidth,
		FixedHeight:     fixedHeight,
		FitScreen:       fitScreen,
		StretchedScreen: stretchedScreen,
		Colored:         colored,
		Reversed:        reversed,
	}
	return convertOptions, nil
}

func usage() {
	fmt.Fprintf(os.Stderr, `image2ascii version: image2ascii/1.0.0 
>> HomePage: https://github.com/qeesung/image2ascii
>> Issue   : https://github.com/qeesung/image2ascii/issues
>> Author  : qeesung
Usage: image2ascii [-s] -f <filename> -r <ratio> -w <width> -g <height>

Options:
`)
	flag.PrintDefaults()
}
