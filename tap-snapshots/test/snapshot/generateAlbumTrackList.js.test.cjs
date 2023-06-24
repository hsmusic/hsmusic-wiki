/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/snapshot/generateAlbumTrackList.js TAP generateAlbumTrackList (snapshot) > basic behavior, default track section 1`] = `
<ul>
    <li>Item: Track 1</li>
    <li>Item: Track 2</li>
    <li>Item: Track 3</li>
    <li>Item: Track 4</li>
</ul>
`

exports[`test/snapshot/generateAlbumTrackList.js TAP generateAlbumTrackList (snapshot) > basic behavior, with track sections 1`] = `
<dl class="album-group-list">
    <dt class="content-heading" tabindex="0">First section (~1:30):</dt>
    <dd>
        <ul>
            <li>Item: Track 1</li>
            <li>Item: Track 2</li>
            <li>Item: Track 3</li>
        </ul>
    </dd>
    <dt class="content-heading" tabindex="0">Second section (0:05):</dt>
    <dd><ul><li>Item: Track 4</li></ul></dd>
</dl>
`
