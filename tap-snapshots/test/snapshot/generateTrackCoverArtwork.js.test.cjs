/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/snapshot/generateTrackCoverArtwork.js TAP generateTrackCoverArtwork (snapshot) > display: primary - no unique art 1`] = `
<div id="cover-art-container">
    [mocked: image
     args: [
       [
         { name: 'Damara', directory: 'damara', isContentWarning: false },
         { name: 'Cronus', directory: 'cronus', isContentWarning: false },
         { name: 'Bees', directory: 'bees', isContentWarning: false },
         { name: 'creepy crawlies', isContentWarning: true }
       ]
     ]
     slots: { path: [ 'media.albumCover', 'bee-forus-seatbelt-safebee', 'png' ], thumb: 'medium', id: 'cover-art', reveal: true, link: true, square: true }]
    <p>Tags: <a href="tag/damara/">Damara</a>, <a href="tag/cronus/">Cronus</a>, <a href="tag/bees/">Bees</a></p>
</div>
`

exports[`test/snapshot/generateTrackCoverArtwork.js TAP generateTrackCoverArtwork (snapshot) > display: primary - unique art 1`] = `
<div id="cover-art-container">
    [mocked: image
     args: [ [ { name: 'Bees', directory: 'bees', isContentWarning: false } ] ]
     slots: { path: [ 'media.trackCover', 'bee-forus-seatbelt-safebee', 'beesmp3', 'jpg' ], thumb: 'medium', id: 'cover-art', reveal: true, link: true, square: true }]
    <p>Tags: <a href="tag/bees/">Bees</a></p>
</div>
`

exports[`test/snapshot/generateTrackCoverArtwork.js TAP generateTrackCoverArtwork (snapshot) > display: thumbnail - no unique art 1`] = `
[mocked: image
 args: [
   [
     { name: 'Damara', directory: 'damara', isContentWarning: false },
     { name: 'Cronus', directory: 'cronus', isContentWarning: false },
     { name: 'Bees', directory: 'bees', isContentWarning: false },
     { name: 'creepy crawlies', isContentWarning: true }
   ]
 ]
 slots: { path: [ 'media.albumCover', 'bee-forus-seatbelt-safebee', 'png' ], thumb: 'small', reveal: false, link: false, square: true }]
`

exports[`test/snapshot/generateTrackCoverArtwork.js TAP generateTrackCoverArtwork (snapshot) > display: thumbnail - unique art 1`] = `
[mocked: image
 args: [ [ { name: 'Bees', directory: 'bees', isContentWarning: false } ] ]
 slots: { path: [ 'media.trackCover', 'bee-forus-seatbelt-safebee', 'beesmp3', 'jpg' ], thumb: 'small', reveal: false, link: false, square: true }]
`
