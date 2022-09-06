# :foggy: Image2ascii

[![Build Status](https://travis-ci.org/qeesung/image2ascii.svg?branch=master)](https://travis-ci.org/qeesung/image2ascii)
[![Coverage Status](https://coveralls.io/repos/github/qeesung/image2ascii/badge.svg?branch=master)](https://coveralls.io/github/qeesung/image2ascii?branch=master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/71a3059b49274dde9d81d58cedd80962)](https://app.codacy.com/app/qeesung/image2ascii?utm_source=github.com&utm_medium=referral&utm_content=qeesung/image2ascii&utm_campaign=Badge_Grade_Dashboard)
[![Go Report Card](https://goreportcard.com/badge/github.com/qeesung/image2ascii)](https://goreportcard.com/report/github.com/qeesung/image2ascii)
[![GoDoc](https://godoc.org/github.com/qeesung/image2ascii?status.svg)](https://godoc.org/github.com/qeesung/image2ascii)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Image2ASCII is a library that converts images into ASCII images and provides command-line tools for easy use.

![demo](https://github.com/qeesung/image2ascii/blob/master/docs/images/lufei.gif?raw=true)

## Installation

```bash
go get github.com/qeesung/image2ascii
```

## CLI usage

```bash
image2ascii version: image2ascii/1.0.0
>> HomePage: https://github.com/qeesung/image2ascii
>> Issue   : https://github.com/qeesung/image2ascii/issues
>> Author  : qeesung
Usage: image2ascii [-s] -f <filename> -r <ratio> -w <width> -g <height>

Options:
  -c    Colored the ascii when output to the terminal (default true)
  -f string
        Image filename to be convert (default "docs/images/lufei.jpg")
  -g int
        Expected image height, -1 for image default height (default -1)
  -i    Reversed the ascii when output to the terminal
  -r float
        Ratio to scale the image, ignored when use -w or -g (default 1)
  -s    Fit the terminal screen, ignored when use -w, -g, -r (default true)
  -t    Stretch the picture to overspread the screen
  -w int
        Expected image width, -1 for image default width (default -1)
```

convert the image fit the screen(default is true)
```bash
image2ascii -f docs/images/pikaqiu2.jpg
```
![demo](https://github.com/qeesung/image2ascii/blob/master/docs/images/pikaqiu_s.gif?raw=true)

convert the image to ascii image with fixed width and height
```bash
# width: 100
# height: 30
image2ascii -f docs/images/baozou.jpg -w 100 -g 30
```
![demo](https://github.com/qeesung/image2ascii/blob/master/docs/images/baozou.gif?raw=true)

convert the image to ascii image by ratio
```bash
# ratio: 0.3
# width: imageWidth * 0.3
# height: imageHeight * 0.3
image2ascii -f docs/images/pikaqiu.jpg -r 0.3
```
![demo](https://github.com/qeesung/image2ascii/blob/master/docs/images/pikaqiu.gif?raw=true)

convert the image to stretch the screen
```bash
image2ascii -f docs/images/long.jpg -t
```
![demo](https://github.com/qeesung/image2ascii/blob/master/docs/images/long.gif?raw=true)

convert the image without the color
```bash
image2ascii -f docs/images/lufei.jpg -s -c=false
```

convert the image disable fit the screen
```bash
image2ascii -f docs/images/lufei.jpg -s=false
```

convert the image reverse the chars
```bash
image2ascii -f docs/images/lufei.jpg -i
```

## Library usage

```golang
package main

import (
	"fmt"
	"github.com/qeesung/image2ascii/convert"
	_ "image/jpeg"
	_ "image/png"
)

func main() {
	// Create convert options
	convertOptions := convert.DefaultOptions
	convertOptions.FixedWidth = 100
	convertOptions.FixedHeight = 40

	// Create the image converter
	converter := convert.NewImageConverter()
	fmt.Print(converter.ImageFile2ASCIIString(imageFilename, &convertOptions))
}
```

convert options

```golang
type Options struct {
	Ratio           float64 // convert ratio
	FixedWidth      int  // convert the image width fixed width
	FixedHeight     int  // convert the image width fixed height
	FitScreen       bool // only work on terminal, fit the terminal height or width
	StretchedScreen bool // only work on terminal, stretch the width and heigh to overspread the terminal screen
	Colored         bool // only work on terminal, output ascii with color
	Reversed        bool // if reverse the ascii pixels
}
```

supported convert function
```golang
type Converter interface {
	// convert a image object to ascii matrix
	Image2ASCIIMatrix(image image.Image, imageConvertOptions *Options) []string
	// convert a image object to ascii matrix and then join the matrix to a string
	Image2ASCIIString(image image.Image, options *Options) string
	// convert a image object by input a string to ascii matrix
	ImageFile2ASCIIMatrix(imageFilename string, option *Options) []string
	// convert a image object by input a string to ascii matrix then join the matrix to a string
	ImageFile2ASCIIString(imageFilename string, option *Options) string
}
```

## Sample outputs

| Raw Image                                                                                     | ASCII Image                                                                                              |
|:---------------------------------------------------------------------------------------------:|:--------------------------------------------------------------------------------------------------------:|
| ![](https://raw.githubusercontent.com/qeesung/image2ascii/master/docs/images/lufei.jpg)      | ![](https://raw.githubusercontent.com/qeesung/image2ascii/master/docs/images/lufei_ascii.png)           |
| ![](https://raw.githubusercontent.com/qeesung/image2ascii/master/docs/images/lufei.jpg)      | ![](https://raw.githubusercontent.com/qeesung/image2ascii/master/docs/images/lufei_ascii_colored.png)   |
| ![](https://raw.githubusercontent.com/qeesung/image2ascii/master/docs/images/pikaqiu.jpeg)   | ![](https://raw.githubusercontent.com/qeesung/image2ascii/master/docs/images/pikaqiu_ascii.png)         |
| ![](https://raw.githubusercontent.com/qeesung/image2ascii/master/docs/images/pikaqiu.jpeg)   | ![](https://raw.githubusercontent.com/qeesung/image2ascii/master/docs/images/pikaqiu_ascii_colored.png) |
| ![](https://raw.githubusercontent.com/qeesung/image2ascii/master/docs/images/baozou.jpg)     | ![](https://raw.githubusercontent.com/qeesung/image2ascii/master/docs/images/baozou_ascii.png)          |
| ![](https://raw.githubusercontent.com/qeesung/image2ascii/master/docs/images/baozou.jpg)     | ![](https://raw.githubusercontent.com/qeesung/image2ascii/master/docs/images/baozou_ascii_colored.png)  |

## License

This project is under the MIT License. See the [LICENSE](https://github.com/qeesung/image2ascii/blob/master/LICENSE) file for the full license text.
