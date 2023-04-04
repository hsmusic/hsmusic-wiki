/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/snapshot/generateAlbumTrackListItem.js TAP generateAlbumTrackListItem (snapshot) > basic behavior 1`] = `
<li style="--primary-color: #33cc77">(0:54) <a href="track/final-spice/" style="--primary-color: #33cc77; --dim-color: #437854">Final Spice</a> <span class="by">by <a href="artist/toby-fox/">Toby Fox</a> and <a href="artist/james-roach/">James Roach</a></span></li>
`

exports[`test/snapshot/generateAlbumTrackListItem.js TAP generateAlbumTrackListItem (snapshot) > hide artists if inherited from album 1`] = `
<li>(_:__) <a href="track/track1/">Same artists, same order</a></li>
<li>(_:__) <a href="track/track2/">Same artists, different order</a></li>
<li>(_:__) <a href="track/track3/">Extra artist</a> <span class="by">by <a href="artist/toby-fox/">Toby Fox</a>, <a href="artist/james-roach/">James Roach</a>, and <a href="artist/clark-powell/">Clark Powell</a></span></li>
<li>(_:__) <a href="track/track4/">Missing artist</a> <span class="by">by <a href="artist/toby-fox/">Toby Fox</a></span></li>
`

exports[`test/snapshot/generateAlbumTrackListItem.js TAP generateAlbumTrackListItem (snapshot) > zero duration, zero artists 1`] = `
<li>(_:__) <a href="track/you-have-got-to-be-about-the-most-superficial-commentator-on-con-langues-since-the-idiotic-b-gilson/">You have got to be about the most superficial commentator on con-langues since the idiotic B. Gilson.</a></li>
`
