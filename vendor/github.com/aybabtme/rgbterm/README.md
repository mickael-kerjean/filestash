# RGB terminal

Have you had enough of the same 16 colors in your terminal?

Welcome to a new world. A new world where colors are plentyful.
A world in 256 colors.

![so many colors!](https://cloud.githubusercontent.com/assets/1189716/3563662/15e67546-0a49-11e4-871e-47e694d08981.png)

# Usage

```go
// pick a color
var r, g, b uint8
r, g, b = 252, 255, 43
// choose a word
word := "=)"
// colorize it!
coloredWord := rgbterm.FgString(word, r, g, b)
// print it!
fmt.Println("Oh!", coloredWord, "hello!")
```

> ![screen shot 2014-07-13 at 0 56 44](https://cloud.githubusercontent.com/assets/1189716/3563695/54e7f048-0a4a-11e4-8b53-613761c6c4e2.png)

Also, to be correct: there are 216 colors and 16 grey scales. For more details, [Xterm][xterm-wiki].

[xterm-wiki]: https://en.wikipedia.org/wiki/Xterm
