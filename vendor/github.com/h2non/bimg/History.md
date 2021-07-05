
v1.1.5 / 2020-11-21
===================

  * Adds AVIF support [#356](https://github.com/h2non/bimg/pull/356)
  
v1.1.4 / 2020-08-04
==================

  * Merge pull request #346 from fredeastside/more_exif_data
  * add most useful exif data to metadata

v1.1.3 / 2020-08-04
===================

  * feat: version history v1.1.3
  * fix(ci): disable <8.7 libvips
  * feat: autorotate
  * feat: bump version
  * Merge pull request #347 from vansante/master
  * Merge pull request #345 from fredeastside/more_exif_data
  * add more exif data to metadata
  * Merge pull request #3 from laurentiuilie/add-support-for-heifs-file
  * add brands heis, hevc
  * Merge pull request #2 from laurentiuilie/add-support-for-heifs-file
  * add test image for heifs
  * remove test file and add the check
  * add support for HEIFS file
  * fix(palette): indentation
  * Merge pull request #337 from theplant/master
  * support Palette option for png

v1.1.2 / 2020-06-08
===================

  * feat(history): add changes
  * fix(#335): disable image flatten type conditional

v1.1.1 / 2020-06-08
===================

  * feat(history): add changes
  * feat(version): bump patch
  * refactor(docs): add libvips install reference
  * fix(ci): disable old libvips versions
  * fix(install): use latest libvips version
  * fix(tests): add heif exception in libvips < 8.8
  * refactor(ci): use libvips 8.7
  * fix(History): use proper version

v1.1.0 / 2020-06-07
===================

  * refactor(ci): update libvips versions
  * refactor(ci): update libvips versions
  * refactor(ci): temporarely disable libvips
  * feat(history): add version changes
  * feat(ci): enable libvips versions
  * fix(ci)
  * fix(ci)
  * fix(ci): try exporting env vars
  * fix
  * feat: add Dockerfile / Docker-driven CI job
  * fix(co)
  * feat(version): bump minor to 1
  * fix(ci): try new install
  * fix(ci): try new install
  * fix(ci): add curl package
  * fix(ci): add curl package
  * fix(ci): add curl package
  * fix(ci): try new install
  * fix(ci): indent style
  * fix(ci): indent style
  * fix(ci): indent style
  * Merge pull request #299 from evanoberholster/master
  * refactor(ci): disable verions matrix
  * refactor(docs): use github.com package import path
  * feat: add test image
  * Merge pull request #281 from pohang/skip_smartcrop
  * Merge pull request #317 from larrabee/master
  * Merge pull request #307 from OrderMyGear/eslam/ch15924/some-product-images-have-a-border
  * refactor(travis): adjust matrix versions
  * Merge pull request #333 from simia-tech/master
  * Fix orientation in vipsFlip call (resizer rotateAndFlipImage)
  * chore(docs): delete old contributor
  * enable vipsAffine to use  `Extend` option value and send it to lipvips this will change the default from the one that lipvips use which is `background` to the ones that bimg use which is  `C.VIPS_EXTEND_BLACK` but because the lip add extra 1 or .5 pix the background is considered black anyway so this will not affect anyone but will fix the bug of having border on the right and bottom of some images
  * Merge pull request #327 from shoreward/master
  * update libvips documentation links
  * fix(vips.h): delete preprocessor HEIF version check
  * Merge pull request #320 from cgroschupp/feat/reduce-png-save-size
  * use VIPS_FOREIGN_PNG_FILTER_ALL in vips_pngsave_bridge
  * fix(resizer): add exported error comment
  * Merge branch 'master' of https://github.com/h2non/bimg
  * chore(ci): temporarily disable go/libvips versions
  * Merge pull request #291 from andrioid/patch-1
  * Merge pull request #293 from team-lab/gammaFilter
  * Merge pull request #315 from vansante/heif
  * feat(version): bump patch
  * Fix bug with images with alpha channel on embeding background
  * Fix typo
  * Dont upgrade version, add missing test file
  * Add support for other HEIF mimetype
  * Supporting auto rotate for HEIF/HEIC images.
  * Adding support for heif (i.e. heic files).
  * Merge branch 'master' into master
  * feat(travis): add libvips 8.6.0 matrix
  * GammaFilter
  * Adds support to Elementary OS Loki
  * Add min dimension logic to smartcrop
  * Merge pull request #271 from Dynom/ImprovingAreaWidthTestCoverage
  * Adding a test case that verifies #250
  * Bumping versions in preinstall script
  * Update Transform ICC Profiles with Input Profile

v1.0.19 / 2018-12-09
====================

  * feat(travis): remove old Go versions, add Go 1.11
  * Merge pull request #224 from kishorgandham/patch-1
  * Merge pull request #242 from acaloiaro/documentation-url-updates
  * Merge pull request #266 from bbernhard/master
  * Merge pull request #250 from fisherking/master
  * set vips version to 8.6.5
  * add support for Debian 9 to preinstall.sh
  * Merge pull request #265 from c93614/master
  * Merge branch 'master' into master
  * Merge pull request #262 from danpersa/update-vips
  * Updated the libvips tarbal_url and also updated the vips version
  * Merge pull request #264 from golint-fixer/master
  * Fix golint import path
  * Make it compatible with the latest vips. Fixes #255
  * Fix AreaWidth calculation
  * Libvips documentation URL and README copy updates
  * feat(travis): add latest libvips and Go runtime versions
  * Merge pull request #226 from muxinc/fix-flip-and-flop-axes
  * Fixes #225 by correcting the flip and flop directions
  * Fix image crop during embed

v1.0.18 / 2017-12-22
====================

  * feat(version): bump to v1.0.18
  * Merge pull request #216 from Bynder/master
  * Merge pull request #208 from mikestead/feature/webp-lossless
  * Remove go-debug usage
  * refactor(docs): remove codesponsor :(
  * fix(options): use float64 type in Options.Threshold
  * Merge pull request #206 from tstm/add-trim-options
  * Add lossless option for saving webp
  * Set the test file to write its own file
  * Add the option to use background and threshold options on trim

v1.0.17 / 2017-11-14
====================

  * feat(version): bump to v1.0.17
  * refactor(resizer): remove fmt statement
  * fix(type_test): use string formatting
  * Merge pull request #207 from traum-ferienwohnungen/nearest-neighbour
  * Add nearest-neighbour interpolation
  * Merge pull request #203 from traum-ferienwohnungen/fix_icc_memory_leak
  * Fix memory leak on icc_transform

v1.0.16 / 2017-10-30
====================

  * feat(version): bump to v1.0.16
  * fix(travis): use install directive
  * Merge branch 'master' of https://github.com/h2non/bimg
  * feat: add Gopkg manifests, move fixtures to testdata, add vendor dependencies
  * Merge pull request #202 from openskydoor/openskydoor/fix-build-tag
  * fix build tag
  * fix(#199): presinstall.sh tarball download URL

v1.0.15 / 2017-10-05
====================

  * feat(version): bump to v1.0.15
  * feat(History): update version changes
  * Merge pull request #198 from greut/webpload
  * Add shrink-on-load for webp.
  * Merge pull request #197 from greut/typos
  * Small typo.
  * feat(docs): add codesponsor

v1.0.14 / 2017-09-12
====================

  * feat(version): bump to v1.0.14
  * Merge pull request #192 from greut/trim
  * Adding trim operation.
  * Merge pull request #191 from greut/alpha4
  * Update 8.6 to alpha4.

v1.0.13 / 2017-09-11
====================

  * feat(version). bump to v1.0.13
  * Merge pull request #190 from greut/typos
  * Fix typo and small cleanup.

v1.0.12 / 2017-09-10
====================

  * feat(version): bump to v1.0.12
  * feat(History): update version changes
  * Merge branch '99designs-vips-reduce'
  * fix(reduce): resolve conflicts with master
  * Use vips reduce when downscaling

v1.0.11 / 2017-09-10
====================

  * Merge pull request #186 from h2non/fix/#162-resize-garbage-collection
  * feat(version): bump to v1.0.11
  * feat(History): update version changes
  * feat(#189): allow strip image metadata via bimg.Options.StripMetadata = bool
  * fix(resize): code format issue
  * refactor(resize): add Go version comment
  * refactor(tests): fix minor code formatting issues
  * fix(#162): garbage collection fix. split Resize() implementation for Go runtime specific
  * feat(travis): add go 1.9
  * Merge pull request #183 from greut/autorotate
  * Proper handling of the EXIF cases.
  * Merge pull request #184 from greut/libvips858
  * Merge branch 'master' into libvips858
  * Merge pull request #185 from greut/libvips860
  * Add libvips 8.6 pre-release
  * Update to libvips 8.5.8
  * fix(resize): runtime.KeepAlive is only Go
  * fix(#159): prevent buf to be freed by the GC before resize function exits
  * Merge pull request #171 from greut/fix-170
  * Check the length before jumping into buffer.
  * Merge pull request #168 from Traum-Ferienwohnungen/icc_transform
  * Add option to convert embedded ICC profiles
  * Merge pull request #166 from danjou-a/patch-1
  * Fix Resize verification value
  * Merge pull request #165 from greut/libvips846
  * Testing using libvips8.4.6 from Github.

v1.0.10 / 2017-06-25
====================

  * feat(version): bump minor
  * Merge pull request #164 from greut/length
  * Add Image.Length()
  * Merge pull request #163 from greut/libvips856
  * Run libvips 8.5.6 on Travis.
  * Merge pull request #161 from henry-blip/master
  * Expose vips cache memory management functions.
  * feat(docs): add watermark image note in features

v1.0.9 / 2017-05-25
===================

  * feat(docs): add smart crop note
  * feat(version): bump to v1.0.9
  * feat(History): update changes
  * Merge pull request #156 from Dynom/SmartCropToGravity
  * Adding a test, verifying both ways of enabling SmartCrop work
  * Merge pull request #149 from waldophotos/master
  * Replacing SmartCrop with a Gravity option
  * refactor(docs): v8.4
  * Change for older LIBVIPS versions. `vips_bandjoin_const1` is added in libvips 8.2.
  * Second try, watermarking memory issue fix

v1.0.8 / 2017-05-18
===================

  * refactor(docs): upgrade recommended version to libvips 8.5
  * feat(version): bump to 1.0.8
  * Merge pull request #145 from greut/smartcrop
  * Merge pull request #155 from greut/libvips8.5.5
  * Update libvips to 8.5.5.
  * Adding basic smartcrop support.
  * Merge pull request #153 from abracadaber/master
  * Added Linux Mint 17.3+ distro names
  * feat(docs): add new maintainer notice (thanks to @kirillDanshin)
  * Merge pull request #152 from greut/libvips85
  * Download latest version of libvips from github.
  * Merge pull request #147 from h2non/revert-143-master
  * Revert "Fix for memory issue when watermarking images"
  * Merge pull request #146 from greut/minor-major
  * Merge pull request #143 from waldophotos/master
  * Merge pull request #144 from greut/go18
  * Fix tests where minor/major were mixed up
  * Enabled go 1.8 builds.
  * Fix the unref of images, when image isn't transparent
  * Fix for memory issue when watermarking images
  * feat(docs): add maintainers sections
  * Merge pull request #132 from jaume-pinyol/WATERMARK_SUPPORT
  * Add support for image watermarks
  * Merge pull request #131 from greut/versions
  * Running tests on more specific versions.
  * refactor(preinstall.sh): remove deprecation notice
  * Update preinstall.sh
  * fix(requirements): required libvips 7.42
  * fix(History): typo
  * chore(History): add breaking change note

v1.0.7 / 2017-01-13
===================

  * feat(History): update changes
  * Merge pull request #124 from greut/tiffsave
  * feat(version): bump to v1.0.7
  * Merge pull request #129 from danpersa/fix-128
  * Fix: Crop is doing resize. Closes #128
  * Refactoring IsTypeSupport to deal with save.
  * Adding support for TIFF save.
  * Saving to TIFF should also fail
  * feat(docs): link to preinstall.sh from bimg reposityr
  * feat: adds preinstall.sh from sharp project
  * Merge pull request #122 from greut/magick
  * Raise an error when trying to save as MAGICK type
  * Testing the formats that cannot be saved
  * feat(docs): update badges
  * feat(docs): update badges

v1.0.6 / 2016-11-12
===================

  * feat(version): bump to 1.0.6
  * Merge pull request #118 from shoeboxapp/png16
  * Merge pull request #119 from greut/jp2
  * Merge pull request #121 from greut/matrix
  * Build against various libvips versions
  * Do not free a pointer you don't own
  * Adding JPEG2000 file for the type tests
  * Cleaner fix
  * Handle 16-bit PNGs
  * Fix: remove travis 1.5 golang
  * Merge pull request #120 from chonthu/patch-1
  * Update README.md
  * Merge pull request #115 from h2non/develop
  * Merge pull request #113 from h2non/develop
  * Merge pull request #112 from h2non/develop
  * Merge pull request #110 from h2non/develop
  * Merge pull request #109 from h2non/develop

v1.0.5 / 2016-10-01
===================

  * feat(options): add link to libvips API docs for Extend
  * feat(version): bump to 1.0.5
  * fix(options): code style comment
  * refactor(resize): use not equal operator (again)
  * fix(#106): allow custom area extraction without x/y axis
  * feat(#92): support Extend param with optional background

v1.0.4 / 2016-09-29
===================

  * feat(version): bump to 1.0.4
  * fix(vips): check magick type support

v1.0.3 / 2016-09-28
===================

  * feat(docs): update History with API changes
  * feat(version): bump to 1.0.3
  * fix(background): pass proper background RGB color
  * feat(types): infer types in runtime
  * fix(type): svg type checking
  * fix(type): check buffer length
  * refactor(types): do proper image typ casting
  * refactor(docs)
  * fix(lint): fix code style

v1.0.2 / 2016-09-27
===================

  * merge(master)
  * feat(version): bump to 1.0.2
  * feat(#95): support multiple formats
  * fix(tests)
  * Merge pull request #108 from mikepulaski/master
  * Auto-width and height calculations now round instead of floor.
  * Merge pull request #105 from jibingeo/master
  * Fixes issue with typecast from GType to int
  * Add test to check ICC profile
  * Merge pull request #104 from nvartolomei/png-16bit-alpha-background
  * fix(flatten): fix flattening with background for 16bit transparent pngs
  * Merge pull request #102 from aarti/master
  * fix go vet issues
  * Build on Go1.7
  * Update travis build
  * Adding GIF, PDF and SVG support (libvips 8.3)
  * Documentation error
  * Merge pull request #96 from greut/rot45
  * Add support for 45° rotation.
  * Merge pull request #92 from h2non/develop

v1.0.1 / 2016-06-22
===================

  * chore(version): bump to 1.0.1
  * Merge pull request #91 from h2non/master
  * Merge pull request #90 from aarti/master
  * Take care to not dereference the original image a second time
  * Merge pull request #88 from blippar/master
  * Merge pull request #1 from blippar/check_alpha
  * Fix formatting
  * Check if there is an alpha channel before flattening
  * feat(docs): add production note
  * Merge pull request #86 from h2non/develop
  * Merge pull request #85 from h2non/develop

v1.0.0 / 2016-04-21
===================

  * feat(docs): use v1 in go get
  * refactor(travis): remove duplicated command
  * feat(version): v1 release. see history for details

v0.1.24 / 2016-03-01
====================

  * fix(docs): minor typo
  * Merge pull request #81 from h2non/develop
  * feat(travis): use go 1.6
  * feat(docs): add coverage badge
  * Merge pull request #79 from h2non/develop
  * Merge pull request #77 from h2non/develop
  * Merge pull request #76 from h2non/develop

0.1.24 / 2016-02-09
===================

  * feat(version): bump
  * fix(resize): auto rotate image before resize calculus

0.1.23 / 2016-02-05
===================

  * feat(versio): bump
  * fix(rotation)

0.1.22 / 2016-01-30
===================

  * feat(travis): add GO 1.5
  * feat(version): bump
  * fix(rotate): pre-rotate image based on EXIT orientation
  * Merge pull request #75 from h2non/master
  * feat(test): resize only by height o width
  * merge(upstream)
  * feat(#72): add helpful debug info in docs
  * feat(test): add vertical image fixtures with multiple test cases
  * feat(docs): add goreport badge
  * Merge pull request #67 from h2non/master
  * Merge pull request #66 from cneerdaels/sharpen
  * Added interface and test for sharpen
  * refactor(resize): clone options by value
  * merge(upstream)
  * refactor(docs)
  * refactor(resize): simplify code
  * fix(docs): typo
  * feat(docs): add toc, remove API docs
  * merge(master)
  * refactor(vips): define constant
  * fix(docs): typo
  * feat(#60): support zero top and left params in extract operation
  * refactor(docs): support with libvips 8.0 is stable for now
  * feat(docs): add libvips version compatibility note
  * refactor(type): simplify image type matching

0.1.21 / 2015-09-29
===================

  * feat(version): bump
  * fix(#56)
  * merge(#55)
  * refactor(#55): minor changes, use proper declarations, unref image
  * - Adding a Background option when flattening out a transparent PNG
  * feat(docs): update benchmarks
  * feat(docs): add list of contributors
  * feat(docs): update API docs
  * feat(#52): add test case
  * vips_gaussblur: remove dependency on libmath
  * vips__gaussblur: renamed to vips_gaussblur_bridge
  * resize: move effects to more explicit methods
  * vips__gaussblur: add the missing sentinel
  * transformImage: apply gaussian blur if needed
  * vips: add a vips__gaussblur method

0.1.20 / 2015-09-08
===================

  * feat(version): bump
  * merge(zllak-debian)
  * merge(zllak-debian)
  * vips.h: problem with vips_init()
  * vips.h: fail to build on Debian Jessie
  * refactor(vips): free watermark cache. refactor vips.h
  * refactor(vips): use shortcut to VipsImage C type
  * fix(docs): remove old badge

0.1.19 / 2015-07-28
===================

  * version(bump)
  * feat(#49)
  * feat(#49)
  * refactor(docs): description

0.1.18 / 2015-07-11
===================

  * feat(version): bump
  * refactor(colourspace)
  * feat(docs): add force resize example
  * fix(#46): transform to proper image size
  * feat: remove fixture
  * refactor(#47): minor refactors, code normalization and test coverage
  * Merge pull request #47 from greut/45-grayscale
  * Add support for colourspace (fix #45)
  * fix(resize): default options
  * refactor(resize)
  * fix(#46): infer resize operation
  * fix(#46): infer resize operation
  * refactor(docs): description
  * fix(docs)
  * fix(test): bad option field

0.1.17 / 2015-06-13
===================

  * feat(version): bump
  * feat(docs): update API
  * feat: allow to remove ICC profile metadata

0.1.16 / 2015-06-13
===================

  * feat: save a RGB colorspace
  * feat(version): bump
  * fix(#43)

0.1.15 / 2015-06-12
===================

  * feat(version): bump
  * feat(docs): update API docs
  * merge(#42)
  * fix(#42): change interlace type. fix C bindings
  * This should not have been added.
  * Added progressive jpeg functionality.
  * fix(docs): minor typo fixes
  * feat(docs): add openslide how to install. Related with #40
  * refactor(docs): feature list
  * refactor(vips): switch option
  * refactor(vips): remove debug statement, add comments
  * Merge pull request #39 from bfitzsimmons/patch-1
  * Fixed the JPEG watermark benchmark.

0.1.14 / 2015-05-24
===================

  * feat(version): bump
  * refactor(docs): description
  * refactor(docs): description
  * merge
  * refactor(vips)
  * fix(badge)
  * refactor(badge): release
  * refactor(docs): description
  * refactor(docs): remove beta note
  * fix(docs): watermark example

0.1.13 / 2015-04-27
===================

  * feat(version): bump
  * feat(crop): add method shortcuts for crop

0.1.12 / 2015-04-26
===================

  * feat(version): bump
  * fix(#35): save webp
  * fix(travis): fuck coveralls

0.1.11 / 2015-04-25
===================

  * feat(version): bump
  * refactor(docs): description
  * fix(#32): bad crop
  * fix(#33): bad auto rotatino
  * refactor(docs): links
  * merge
  * feat(docs): update API
  * refactor(docs): description
  * fix(test): resize

0.1.10 / 2015-04-16
===================

  * fix(test)
  * feat(version): bump
  * fix(#31)
  * refactor(vips): remove obvious code

0.1.9 / 2015-04-15
==================

  * ffeat(version): bump
  * fix(#30): one concurrent thread by default
  * refactor(docs)
  * refactor(docs): update badge
  * refactor(file)
  * feat(docs): add imaginary link
  * feat(docs): add imaginary link

0.1.8 / 2015-04-12
==================

  * feat(version): bump
  * fix(vips): panic error on exif orientation
  * refactor(watermark): auto define width
  * fix(#28): zoom requires extract params
  * fix(#28): zoom requires extract params
  * refactor: comparse as pure string

0.1.7 / 2015-04-11
==================

  * feat(version): bump
  * feat(docs): update docs
  * feat(test): better coverage for vips interface
  * refactor(vips.h): watermark replicate
  * refactor: vips.h, fix(docs):

0.1.6 / 2015-04-11
==================

  * refactor(vips.h)
  * refactor(resize)
  * feat(docs): update benchmark
  * refactor(debug)
  * refactor: remove colorspace feature
  * feat(version): bump
  * feat(#15): more benchmarks
  * feat: add fixture
  * feat(#27, #25): new features
  * feat(#26): support zoom. several refactors and fixes
  * feat(#25, #21)

0.1.5 / 2015-04-08
==================

  * feat(version): bump
  * fix(vips): clean reference for interpolator
  * feat(image): add method to retrieve the image
  * feat(docs): update
  * feat: add tests

0.1.4 / 2015-04-08
==================

  * feat(version): bump
  * feat(image): pass gravity to crop
  * fix(rotate): max angle to 270
  * refactor(vips): rename C bridge function

0.1.3 / 2015-04-08
==================

  * feat(version): bump
  * refactor(resize): remove debug statement
  * feat(test): vips
  * feat(#20): support flop operation (interface broken, sorry im still beta)
  * fix(test): image
  * fix(image): tests
  * fix(image): tests
  * feat(#19): maximum image size
  * feat(#15): add benchmark tests
  * feat(#18, #17)
  * fix(vips): bad argument
  * fix(docs): example
  * fix(docs): description
  * feat(docs): add link to memory tests
  * refactor(docs): description
  * fix(docs): description
  * refactor(docs): description
  * fix(docs): description
  * refactor(docs): normalize description and examples
  * refactor(docs): normalize description and examples
  * refactor(docs): description

0.1.2 / 2015-04-07
==================

  * feat(version): chore
  * fix(extract): detect area options
  * feat(version): bump
  * feat(docs): force update

0.1.1 / 2015-04-07
==================

  * feat(#15): add benchmark tests
  * fix(vips): memory inconsistency
  * merge
  * fix: possible leaks
  * refactor(docs)
  * feat(travis): add coveralls support
  * feat(travis): add coveralls support
  * fix(docs): add releases link

0.1.0 / 2015-04-07
==================

  * fix(test)
  * refactor(docs)
  * fix(test): image metadata
  * fix(test): image metadata
  * feat(docs): add API and examples
  * refactor(resize): extract
  * feat: add fixtures
  * fix(resize): support rotate
  * refactor(resize)
  * feat(#13): metadata tests
  * refactor: bindings
  * refactor(vips)
  * refactor(vips)
  * refactor: remove file
  * feat(metadata): add tests
  * refactor(docs)

0.1.0-beta.0 / 2015-04-06
=========================

  * fix(crop): tests
  * refactor: crop and tests
  * feat: support resize and enlarge images
  * feat: add file helper
  * feat: support multiple outputs
  * feat(#6, #10, #11)
  * refactor
  * refactor. feat(test): add fixtures
  * refactor(vips): check image type
  * refactor(docs): go version
  * feat(docs): add Go version support
  * update travis.yaml
  * feat(#9): add Travis support
  * feat(#8): add type alias
  * feat(docs): add badge
  * refactor: vips.h
  * feat(docs): add API example
  * refactor(type)
  * refactor: indent style
  * feat(#3, #5): support image operations
  * feat(#1): initial implementation
  * feat: add version file
  * refactor(docs): description
  * feat: add file
  * feat: add readme

v1.1.3 / 2020-08-04
==================

  * fix(ci): disable <8.7 libvips
  * feat: autorotate
  * feat: bump version
  * Merge pull request #347 from vansante/master
  * Merge pull request #345 from fredeastside/more_exif_data
  * add more exif data to metadata
  * Merge pull request #3 from laurentiuilie/add-support-for-heifs-file
  * add brands heis, hevc
  * Merge pull request #2 from laurentiuilie/add-support-for-heifs-file
  * add test image for heifs
  * remove test file and add the check
  * add support for HEIFS file
  * fix(palette): indentation
  * Merge pull request #337 from theplant/master
  * support Palette option for png

v1.1.2 / 2020-06-08
===================

  * fix(#335): disable image flatten type conditional

v1.1.1 / 2020-06-08
===================

  * feat(version): bump patch
  * refactor(docs): add libvips install reference
  * fix(ci): disable old libvips versions
  * fix(install): use latest libvips version
  * fix(tests): add heif exception in libvips < 8.8
  * refactor(ci): use libvips 8.7
  * fix(History): use proper version


v1.1.0 / 2020-06-07
===================

  * feat(ci): enable libvips versions
  * fix(ci)
  * fix(ci)
  * fix(ci): try exporting env vars
  * fix
  * feat: add Dockerfile / Docker-driven CI job
  * fix(co)
  * feat(version): bump minor to 1
  * fix(ci): try new install
  * fix(ci): try new install
  * fix(ci): add curl package
  * fix(ci): add curl package
  * fix(ci): add curl package
  * fix(ci): try new install
  * fix(ci): indent style
  * fix(ci): indent style
  * fix(ci): indent style
  * Merge pull request #299 from evanoberholster/master
  * refactor(ci): disable verions matrix
  * refactor(docs): use github.com package import path
  * feat: add test image
  * Merge pull request #281 from pohang/skip_smartcrop
  * Merge pull request #317 from larrabee/master
  * Merge pull request #307 from OrderMyGear/eslam/ch15924/some-product-images-have-a-border
  * refactor(travis): adjust matrix versions
  * Merge pull request #333 from simia-tech/master
  * Fix orientation in vipsFlip call (resizer rotateAndFlipImage)
  * chore(docs): delete old contributor
  * enable vipsAffine to use  `Extend` option value and send it to lipvips this will change the default from the one that lipvips use which is `background` to the ones that bimg use which is  `C.VIPS_EXTEND_BLACK` but because the lip add extra 1 or .5 pix the background is considered black anyway so this will not affect anyone but will fix the bug of having border on the right and bottom of some images
  * Merge pull request #327 from shoreward/master
  * update libvips documentation links
  * fix(vips.h): delete preprocessor HEIF version check
  * Merge pull request #320 from cgroschupp/feat/reduce-png-save-size
  * use VIPS_FOREIGN_PNG_FILTER_ALL in vips_pngsave_bridge
  * fix(resizer): add exported error comment
  * Merge branch 'master' of https://github.com/h2non/bimg
  * chore(ci): temporarily disable go/libvips versions
  * Merge pull request #291 from andrioid/patch-1
  * Merge pull request #293 from team-lab/gammaFilter
  * Merge pull request #315 from vansante/heif
  * feat(version): bump patch
  * Fix bug with images with alpha channel on embeding background
  * Fix typo
  * Dont upgrade version, add missing test file
  * Add support for other HEIF mimetype
  * Supporting auto rotate for HEIF/HEIC images.
  * Adding support for heif (i.e. heic files).
  * Merge branch 'master' into master
  * feat(travis): add libvips 8.6.0 matrix
  * GammaFilter
  * Adds support to Elementary OS Loki
  * Add min dimension logic to smartcrop
  * Merge pull request #271 from Dynom/ImprovingAreaWidthTestCoverage
  * Adding a test case that verifies #250
  * Bumping versions in preinstall script
  * Update Transform ICC Profiles with Input Profile

## v1.0.18 / 2017-12-22

  * Merge pull request #216 from Bynder/master
  * Merge pull request #208 from mikestead/feature/webp-lossless
  * Remove go-debug usage
  * refactor(docs): remove codesponsor :(
  * fix(options): use float64 type in Options.Threshold
  * Merge pull request #206 from tstm/add-trim-options
  * Add lossless option for saving webp
  * Set the test file to write its own file
  * Add the option to use background and threshold options on trim

## v1.0.17 / 2017-11-14

  * refactor(resizer): remove fmt statement
  * fix(type_test): use string formatting
  * Merge pull request #207 from traum-ferienwohnungen/nearest-neighbour
  * Add nearest-neighbour interpolation
  * Merge pull request #203 from traum-ferienwohnungen/fix_icc_memory_leak
  * Fix memory leak on icc_transform

## v1.0.16 / 2017-10-30

  * fix(travis): use install directive
  * Merge branch 'master' of https://github.com/h2non/bimg
  * feat: add Gopkg manifests, move fixtures to testdata, add vendor dependencies
  * Merge pull request #202 from openskydoor/openskydoor/fix-build-tag
  * fix build tag
  * fix(#199): presinstall.sh tarball download URL

## v1.0.15 / 2017-10-05

  * Merge pull request #198 from greut/webpload
  * Add shrink-on-load for webp.
  * Merge pull request #197 from greut/typos
  * Small typo.
  * feat(docs): add codesponsor

## v1.0.14 / 2017-09-12

  * Merge pull request #192 from greut/trim
  * Adding trim operation.
  * Merge pull request #191 from greut/alpha4
  * Update 8.6 to alpha4.

## v1.0.13 / 2017-09-11

  * Merge pull request #190 from greut/typos
  * Fix typo and small cleanup.

## v1.0.12 / 2017-09-10

  * Merge branch '99designs-vips-reduce'
  * fix(reduce): resolve conflicts with master
  * Use vips reduce when downscaling

## v1.0.11 / 2017-09-10

  * feat(#189): allow strip image metadata via bimg.Options.StripMetadata = bool
  * fix(resize): code format issue
  * refactor(resize): add Go version comment
  * refactor(tests): fix minor code formatting issues
  * fix(#162): garbage collection fix. split Resize() implementation for Go runtime specific
  * feat(travis): add go 1.9
  * Merge pull request #183 from greut/autorotate
  * Proper handling of the EXIF cases.
  * Merge pull request #184 from greut/libvips858
  * Merge branch 'master' into libvips858
  * Merge pull request #185 from greut/libvips860
  * Add libvips 8.6 pre-release
  * Update to libvips 8.5.8
  * fix(resize): runtime.KeepAlive is only Go
  * fix(#159): prevent buf to be freed by the GC before resize function exits
  * Merge pull request #171 from greut/fix-170
  * Check the length before jumping into buffer.
  * Merge pull request #168 from Traum-Ferienwohnungen/icc_transform
  * Add option to convert embedded ICC profiles
  * Merge pull request #166 from danjou-a/patch-1
  * Fix Resize verification value
  * Merge pull request #165 from greut/libvips846
  * Testing using libvips8.4.6 from Github.

## v1.0.10 / 2017-06-25

  * Merge pull request #164 from greut/length
  * Add Image.Length()
  * Merge pull request #163 from greut/libvips856
  * Run libvips 8.5.6 on Travis.
  * Merge pull request #161 from henry-blip/master
  * Expose vips cache memory management functions.
  * feat(docs): add watermark image note in features

## v1.0.9 / 2017-05-25

  * Merge pull request #156 from Dynom/SmartCropToGravity
  * Adding a test, verifying both ways of enabling SmartCrop work
  * Merge pull request #149 from waldophotos/master
  * Replacing SmartCrop with a Gravity option
  * refactor(docs): v8.4
  * Change for older LIBVIPS versions. `vips_bandjoin_const1` is added in libvips 8.2.
  * Second try, watermarking memory issue fix

## v1.0.8 / 2017-05-18

  * Merge pull request #145 from greut/smartcrop
  * Merge pull request #155 from greut/libvips8.5.5
  * Update libvips to 8.5.5.
  * Adding basic smartcrop support.
  * Merge pull request #153 from abracadaber/master
  * Added Linux Mint 17.3+ distro names
  * feat(docs): add new maintainer notice (thanks to @kirillDanshin)
  * Merge pull request #152 from greut/libvips85
  * Download latest version of libvips from github.
  * Merge pull request #147 from h2non/revert-143-master
  * Revert "Fix for memory issue when watermarking images"
  * Merge pull request #146 from greut/minor-major
  * Merge pull request #143 from waldophotos/master
  * Merge pull request #144 from greut/go18
  * Fix tests where minor/major were mixed up
  * Enabled go 1.8 builds.
  * Fix the unref of images, when image isn't transparent
  * Fix for memory issue when watermarking images
  * feat(docs): add maintainers sections
  * Merge pull request #132 from jaume-pinyol/WATERMARK_SUPPORT
  * Add support for image watermarks
  * Merge pull request #131 from greut/versions
  * Running tests on more specific versions.
  * refactor(preinstall.sh): remove deprecation notice
  * Update preinstall.sh
  * fix(requirements): required libvips 7.42
  * fix(History): typo
  * chore(History): add breaking change note

## v1.0.7 / 13-01-2017

- fix(#128): crop image calculation for missing width or height axis.
- feat: add TIFF save output format (**note**: this introduces a minor interface breaking change in `bimg.IsImageTypeSupportedByVips` auxiliary function).

## v1.0.6 / 12-11-2016

- feat(#118): handle 16-bit PNGs.
- feat(#119): adds JPEG2000 file for the type tests.
- feat(#121): test bimg against multiple libvips versions.

## v1.0.5 / 01-10-2016

- feat(#92): support Extend param with optional background.
- fix(#106): allow image area extraction without explicit x/y axis.
- feat(api): add Extend type with `libvips` enum alias.

## v1.0.4 / 29-09-2016

- fix(#111): safe check of magick image type support.

## v1.0.3 / 28-09-2016

- fix(#95): better image type inference and support check.
- fix(background): pass proper background RGB color for PNG image conversion.
- feat(types): validate supported image types by current `libvips` compilation.
- feat(types): consistent SVG image checking.
- feat(api): add public functions `VipsIsTypeSupported()`, `IsImageTypeSupportedByVips()` and `IsSVGImage()`.

## v1.0.2 / 27-09-2016

- feat(#95): support GIF, SVG and PDF formats.
- fix(#108): auto-width and height calculations now round instead of floor.

## v1.0.1 / 22-06-2016

- fix(#90): Do not not dereference the original image a second time.

## v1.0.0 / 21-04-2016

- refactor(api): breaking changes: normalize public members to follow Go naming idioms.
- feat(version): bump to major version. API contract won't be compromised in `v1`.
- feat(docs): add missing inline godoc documentation.
