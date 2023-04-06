/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/snapshot/image.js TAP image (snapshot) > content warnings via tags 1`] = `
<div class="reveal">
    <div class="image-container"><img src="media/album-art/beyond-canon/cover.png"></div>
    <span class="reveal-text-container">
        <span class="reveal-text">
            cw: too cool for school
            <br>
            <span class="reveal-interaction">click to show</span>
        </span>
    </span>
</div>
`

exports[`test/snapshot/image.js TAP image (snapshot) > id with link 1`] = `
<a id="banana" class="box image-link" href="foobar"><div class="image-container"><img src="foobar"></div></a>
`

exports[`test/snapshot/image.js TAP image (snapshot) > id with square 1`] = `
<div class="square"><div class="square-content"><div class="image-container"><img id="banana" src="foobar"></div></div></div>
`

exports[`test/snapshot/image.js TAP image (snapshot) > id without link 1`] = `
<div class="image-container"><img id="banana" src="foobar"></div>
`

exports[`test/snapshot/image.js TAP image (snapshot) > lazy with square 1`] = `
<noscript><div class="square"><div class="square-content"><div class="image-container"><img src="foobar"></div></div></div></noscript>
<div class="square js-hide"><div class="square-content"><div class="image-container"><img class=" lazy" data-original="foobar"></div></div></div>
`

exports[`test/snapshot/image.js TAP image (snapshot) > link with file size 1`] = `
<a class="box image-link" href="media/album-art/pingas/cover.png"><div class="image-container"><img data-original-size="1000000" src="media/album-art/pingas/cover.png"></div></a>
`

exports[`test/snapshot/image.js TAP image (snapshot) > source missing 1`] = `
<div class="image-container"><div class="image-text-area">Example of missing source message.</div></div>
`

exports[`test/snapshot/image.js TAP image (snapshot) > source via path 1`] = `
<div class="image-container"><img src="media/album-art/beyond-canon/cover.png"></div>
`

exports[`test/snapshot/image.js TAP image (snapshot) > source via src 1`] = `
<div class="image-container"><img src="https://example.com/bananas.gif"></div>
`

exports[`test/snapshot/image.js TAP image (snapshot) > square 1`] = `
<div class="square"><div class="square-content"><div class="image-container"><img src="foobar"></div></div></div>
`

exports[`test/snapshot/image.js TAP image (snapshot) > width & height 1`] = `
<div class="image-container"><img width="600" height="400" src="foobar"></div>
`
