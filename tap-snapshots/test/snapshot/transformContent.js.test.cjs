/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > dates 1`] = `
<p><time datetime="Thu, 13 Apr 2023 00:00:00 GMT">4/12/2023</time> Yep!</p>
<p>Very nice: <time datetime="Fri, 25 Oct 2413 03:00:00 GMT">10/25/2413</time></p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > inline images 1`] = `
<p><img src="snooping.png"> as USUAL...</p>
<p>What do you know? <img src="cowabunga.png" width="24" height="32"></p>
<p><a href="to-localized.album/cool-album" style="--primary-color: #123456; --dim-color: #000000">I'm on the left.</a><img src="im-on-the-right.jpg"></p>
<p><img src="im-on-the-left.jpg"><a href="to-localized.album/cool-album" style="--primary-color: #123456; --dim-color: #000000">I'm on the right.</a></p>
<p>Media time! <img src="to-media.path/misc/interesting.png"> Oh yeah!</p>
<p><img src="must.png"><img src="stick.png"><img src="together.png"></p>
<p>And... all done! <img src="end-of-source.png"></p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > links to a thing 1`] = `
<p>This is <a href="to-localized.album/cool-album" style="--primary-color: #123456; --dim-color: #000000">my favorite album</a>.</p>
<p>That&#39;s right, <a href="to-localized.album/cool-album" style="--primary-color: #123456; --dim-color: #000000">Cool Album</a>!</p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > lyrics - basic line breaks 1`] = `
<p>Hey, ho<br>
And away we go<br>
Truly, music</p>
<p>(Oh yeah)<br>
(That&#39;s right)</p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > lyrics - line breaks around tags 1`] = `
<p>The date be <time datetime="Tue, 13 Apr 2004 03:00:00 GMT">4/13/2004</time><br>
I say, the date be <time datetime="Tue, 13 Apr 2004 03:00:00 GMT">4/13/2004</time><br>
<time datetime="Tue, 13 Apr 2004 03:00:00 GMT">4/13/2004</time><br>
<time datetime="Tue, 13 Apr 2004 03:00:00 GMT">4/13/2004</time><time datetime="Tue, 13 Apr 2004 03:00:00 GMT">4/13/2004</time><time datetime="Tue, 13 Apr 2004 03:00:00 GMT">4/13/2004</time><br>
(Aye!)</p>
<p><time datetime="Tue, 13 Apr 2004 03:00:00 GMT">4/13/2004</time><br>
<time datetime="Tue, 13 Apr 2004 03:00:00 GMT">4/13/2004</time><time datetime="Tue, 13 Apr 2004 03:00:00 GMT">4/13/2004</time><br>
<time datetime="Tue, 13 Apr 2004 03:00:00 GMT">4/13/2004</time><br></p>
<p><time datetime="Tue, 13 Apr 2004 03:00:00 GMT">4/13/2004</time><br>
<time datetime="Tue, 13 Apr 2004 03:00:00 GMT">4/13/2004</time>, and don&#39;t ye forget it</p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > lyrics - repeated and edge line breaks 1`] = `
<p>Well, you know<br>
How it goes</p>
<p>Yessiree</p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > non-inline image #1 1`] = `
<div class="content-image">[mocked: image - slots: { src: 'spark.png', link: true, thumb: 'large' }]</div>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > non-inline image #2 1`] = `
<p>Rad.</p>
<div class="content-image">[mocked: image - slots: { src: 'spark.png', link: true, thumb: 'large' }]</div>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > non-inline image #3 1`] = `
<div class="content-image">[mocked: image - slots: { src: 'spark.png', link: true, thumb: 'large' }]</div>
<p>Baller.</p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > super basic string 1`] = `
<p>Neat listing: Albums - by Date</p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > two text paragraphs 1`] = `
<p>Hello, world!</p>
<p>Wow, this is very cool.</p>
`
