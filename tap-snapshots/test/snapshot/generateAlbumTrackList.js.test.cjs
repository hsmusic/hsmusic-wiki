/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/snapshot/generateAlbumTrackList.js > TAP > generateAlbumTrackList (snapshot) > basic behavior, default track section 1`] = `
<ul>
    <li>(0:20) <a href="track/t1/">Track 1</a></li>
    <li>(0:30) <a href="track/t2/">Track 2</a></li>
    <li>(0:40) <a href="track/t3/">Track 3</a></li>
    <li style="--primary-color: #ea2e83">(0:05) <a href="track/t4/">Track 4</a> <span class="by">by <a href="artist/apricot/">Apricot</a> and <a href="artist/peach/">Peach</a></span></li>
</ul>
`

exports[`test/snapshot/generateAlbumTrackList.js > TAP > generateAlbumTrackList (snapshot) > basic behavior, with track sections 1`] = `
<dl class="album-group-list">
    <dt class="content-heading" tabindex="0">First section (~1:30):</dt>
    <dd>
        <ul>
            <li>(0:20) <a href="track/t1/">Track 1</a></li>
            <li>(0:30) <a href="track/t2/">Track 2</a></li>
            <li>(0:40) <a href="track/t3/">Track 3</a></li>
        </ul>
    </dd>
    <dt class="content-heading" tabindex="0">Second section (0:05):</dt>
    <dd><ul><li style="--primary-color: #ea2e83">(0:05) <a href="track/t4/">Track 4</a> <span class="by">by <a href="artist/apricot/">Apricot</a> and <a href="artist/peach/">Peach</a></span></li></ul></dd>
</dl>
`
