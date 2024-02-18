/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > basic markdown 1`] = `
<p>Hello <em>world!</em> This is <strong>SO COOL.</strong></p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > dates 1`] = `
<p><time datetime="Thu, 13 Apr 2023 00:00:00 GMT">4/12/2023</time> Yep!</p>
<p>Very nice: <time datetime="Fri, 25 Oct 2413 03:00:00 GMT">10/25/2413</time></p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > escape end of tag 1`] = `
<p>My favorite album is <a style="--primary-color: #123456" href="to-localized.album/cool-album">[Tactical Omission]</a>.</p>
<p>Your favorite album is <a style="--primary-color: #123456" href="to-localized.album/cool-album">[Tactical Wha-Huh-Now</a>].</p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > escape entire tag 1`] = `
<p>[[album:cool-album|spooky]] <a style="--primary-color: #123456" href="to-localized.album/cool-album">scary</a></p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > escape markdown 1`] = `
<p>What will it be, <em>ye fool?</em> *arr*</p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > hanging indent list 1`] = `
<p>Hello!</p>
<ul>
<li><p>I am a list item and I
go on and on and on
and on and on and on.</p>
</li>
<li><p>I am another list item.
Yeah.</p>
</li>
</ul>
<p>In-between!</p>
<ul>
<li>Spooky,
spooky, I say!</li>
<li>Following list item.
No empty line around me.</li>
<li>Very cool.
So, so cool.</li>
</ul>
<p>Goodbye!</p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > indent on a directly following line 1`] = `
<div>
    <span>Wow!</span>
</div>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > indent on an indierctly following line 1`] = `
<p>Some text.</p>
<p>Yes, some more text.</p>
<pre><code>I am hax0rz!!
All yor base r blong 2 us.
</code></pre>
<p>Aye.</p>
<p>Aye aye aye.</p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > inline images 1`] = `
<p><img src="snooping.png"> as USUAL...</p>
<p>What do you know? <img src="cowabunga.png" width="24" height="32"></p>
<p><a style="--primary-color: #123456" href="to-localized.album/cool-album">I'm on the left.</a><img src="im-on-the-right.jpg"></p>
<p><img src="im-on-the-left.jpg"><a style="--primary-color: #123456" href="to-localized.album/cool-album">I'm on the right.</a></p>
<p>Media time! <img src="to-media.path/misc/interesting.png"> Oh yeah!</p>
<p><img src="must.png"><img src="stick.png"><img src="together.png"></p>
<p>And... all done! <img src="end-of-source.png"></p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > links to a thing 1`] = `
<p>This is <a style="--primary-color: #123456" href="to-localized.album/cool-album">my favorite album</a>.</p>
<p>That&#39;s right, <a style="--primary-color: #123456" href="to-localized.album/cool-album">Cool Album</a>!</p>
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
<div class="content-image-container">[mocked: image - slots: { src: 'spark.png', link: true, thumb: 'large', attributes: [ { class: 'content-image' }, undefined ] }]</div>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > non-inline image #2 1`] = `
<p>Rad.</p>
<div class="content-image-container">[mocked: image - slots: { src: 'spark.png', link: true, thumb: 'large', attributes: [ { class: 'content-image' }, undefined ] }]</div>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > non-inline image #3 1`] = `
<div class="content-image-container">[mocked: image - slots: { src: 'spark.png', link: true, thumb: 'large', attributes: [ { class: 'content-image' }, undefined ] }]</div>
<p>Baller.</p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > super basic string 1`] = `
<p>Neat listing: Albums - by Date</p>
`

exports[`test/snapshot/transformContent.js > TAP > transformContent (snapshot) > two text paragraphs 1`] = `
<p>Hello, world!</p>
<p>Wow, this is very cool.</p>
`
