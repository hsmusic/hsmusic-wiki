import t from 'tap';

import thingConstructors from '#things';

import {
  linkAndBindWikiData,
  stubArtistAndContribs,
  stubFlashAndAct,
  stubThing,
  stubTrackAndAlbum,
  stubWikiData,
} from '#test-lib';

t.test(`Track.album`, t => {
  const {Album, Track, TrackSection} = thingConstructors;

  t.plan(6);

  // Note: These asserts use manual albumData/trackData relationships
  // to illustrate more specifically the properties which are expected to
  // be relevant for this case. Other properties use the same underlying
  // get-album behavior as Track.album so aren't tested as aggressively.

  let wikiData = stubWikiData();

  const track1 = stubThing(wikiData, Track, {directory: 'track1'});
  const track2 = stubThing(wikiData, Track, {directory: 'track2'});
  const album1 = stubThing(wikiData, Album);
  const album2 = stubThing(wikiData, Album);
  const section1 = stubThing(wikiData, TrackSection, {unqualifiedDirectory: 'section1'});
  const section2 = stubThing(wikiData, TrackSection, {unqualifiedDirectory: 'section2'});

  wikiData = null;

  t.equal(track1.album, null,
    `album #1: defaults to null`);

  track1.albumData = [album1, album2];
  track2.albumData = [album1, album2];
  section1.tracks = [track1];
  section2.tracks = [track2];
  section1.albumData = [album1];
  section2.albumData = [album2];
  album1.trackSections = [section1];
  album2.trackSections = [section2];

  t.equal(track1.album, album1,
    `album #2: is album when album's trackSections matches track`);

  track1.albumData = [album2, album1];

  t.equal(track1.album, album1,
    `album #3: is album when albumData is in different order`);

  track1.albumData = [];

  t.equal(track1.album, null,
    `album #4: is null when track missing albumData`);

  section1.tracks = [];

  // XXX_decacheWikiData
  album1.trackSections = [];
  album1.trackSections = [section1];
  track1.albumData = [];
  track1.albumData = [album2, album1];

  t.equal(track1.album, null,
    `album #5: is null when album track section missing tracks`);

  section1.tracks = [track2];

  // XXX_decacheWikiData
  album1.trackSections = [];
  album1.trackSections = [section1];
  track1.albumData = [];
  track1.albumData = [album2, album1];

  t.equal(track1.album, null,
    `album #6: is null when album track section doesn't match track`);
});

t.test(`Track.alwaysReferenceByDirectory`, t => {
  t.plan(7);

  const wikiData = stubWikiData();

  const {track: originalTrack} =
    stubTrackAndAlbum(wikiData, 'original-track', 'original-album');

  const {track: rereleaseTrack, album: rereleaseAlbum} =
    stubTrackAndAlbum(wikiData, 'rerelease-track', 'rerelease-album');

  originalTrack.name = 'Cowabunga';
  rereleaseTrack.name = 'Cowabunga';

  originalTrack.dataSourceAlbum = 'album:original-album';
  rereleaseTrack.dataSourceAlbum = 'album:rerelease-album';

  rereleaseTrack.originalReleaseTrack = 'track:original-track';

  const {XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

  t.equal(originalTrack.alwaysReferenceByDirectory, false,
    `alwaysReferenceByDirectory #1: defaults to false`);

  t.equal(rereleaseTrack.alwaysReferenceByDirectory, true,
    `alwaysReferenceByDirectory #2: is true if rerelease name matches original`);

  rereleaseTrack.name = 'Foo Dog!';

  t.equal(rereleaseTrack.alwaysReferenceByDirectory, false,
    `alwaysReferenceByDirectory #3: is false if rerelease name doesn't match original`);

  rereleaseTrack.name = `COWabunga`;

  t.equal(rereleaseTrack.alwaysReferenceByDirectory, false,
    `alwaysReferenceByDirectory #4: is false if rerelease name doesn't match original exactly`);

  rereleaseAlbum.alwaysReferenceTracksByDirectory = true;
  XXX_decacheWikiData();

  t.equal(rereleaseTrack.alwaysReferenceByDirectory, true,
    `alwaysReferenceByDirectory #5: is true if album's alwaysReferenceTracksByDirectory is true`);

  rereleaseTrack.alwaysReferenceByDirectory = false;

  t.equal(rereleaseTrack.alwaysReferenceByDirectory, false,
    `alwaysReferenceByDirectory #6: doesn't inherit from album if set to false`);

  rereleaseTrack.name = 'Cowabunga';

  t.equal(rereleaseTrack.alwaysReferenceByDirectory, false,
    `alwaysReferenceByDirectory #7: doesn't compare original release name if set to false`);
});

t.test(`Track.artTags`, t => {
  const {ArtTag} = thingConstructors;

  t.plan(6);

  const wikiData = stubWikiData();

  const {track, album} = stubTrackAndAlbum(wikiData);
  const {contribs} = stubArtistAndContribs(wikiData);

  const tag1 =
    stubThing(wikiData, ArtTag, {name: `Tag 1`});

  const tag2 =
    stubThing(wikiData, ArtTag, {name: `Tag 2`});

  const {XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

  t.same(track.artTags, [],
    `artTags #1: defaults to empty array`);

  track.artTags = [`Tag 1`, `Tag 2`];

  t.same(track.artTags, [],
    `artTags #2: is empty if track doesn't have cover artists`);

  track.coverArtistContribs = contribs;

  t.same(track.artTags, [tag1, tag2],
    `artTags #3: resolves if track has cover artists`);

  track.coverArtistContribs = null;
  album.trackCoverArtistContribs = contribs;

  XXX_decacheWikiData();

  t.same(track.artTags, [tag1, tag2],
    `artTags #4: resolves if track inherits cover artists`);

  track.disableUniqueCoverArt = true;

  t.same(track.artTags, [],
    `artTags #5: is empty if track disables unique cover artwork`);

  album.coverArtistContribs = contribs;
  album.artTags = [`Tag 2`];

  XXX_decacheWikiData();

  t.notSame(track.artTags, [tag2],
    `artTags #6: doesn't inherit from album's art tags`);
});

t.test(`Track.artistContribs`, t => {
  const {Album, Artist, Track, TrackSection} = thingConstructors;

  t.plan(4);

  const wikiData = stubWikiData();

  const track =
    stubThing(wikiData, Track);

  const section =
    stubThing(wikiData, TrackSection, {tracks: [track]});

  const album =
    stubThing(wikiData, Album, {trackSections: [section]});

  const artist1 =
    stubThing(wikiData, Artist, {name: `Artist 1`});

  const artist2 =
    stubThing(wikiData, Artist, {name: `Artist 2`});

  const {XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

  t.same(track.artistContribs, [],
    `artistContribs #1: defaults to empty array`);

  album.artistContribs = [
    {artist: `Artist 1`, annotation: `composition`},
    {artist: `Artist 2`, annotation: null},
  ];

  XXX_decacheWikiData();

  t.match(track.artistContribs,
    [{artist: artist1, annotation: `composition`}, {artist: artist2, annotation: null}],
    `artistContribs #2: inherits album artistContribs`);

  track.artistContribs = [
    {artist: `Artist 1`, annotation: `arrangement`},
  ];

  t.match(track.artistContribs, [{artist: artist1, annotation: `arrangement`}],
    `artistContribs #3: resolves from own value`);

  track.artistContribs = [
    {artist: `Artist 1`, annotation: `snooping`},
    {artist: `Artist 413`, annotation: `as`},
    {artist: `Artist 2`, annotation: `usual`},
  ];

  t.match(track.artistContribs,
    [{artist: artist1, annotation: `snooping`}, {artist: artist2, annotation: `usual`}],
    `artistContribs #4: filters out names without matches`);
});

t.test(`Track.color`, t => {
  t.plan(4);

  const wikiData = stubWikiData();

  const {track, album, section} = stubTrackAndAlbum(wikiData);

  const {XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

  t.equal(track.color, null,
    `color #1: defaults to null`);

  album.color = '#abcdef';
  section.color = '#beeeef';

  album.trackSections = [section];

  XXX_decacheWikiData();

  t.equal(track.color, '#beeeef',
    `color #2: inherits from track section before album`);

  track.color = '#123456';

  t.equal(track.color, '#123456',
    `color #3: is own value`);

  t.throws(() => { track.color = '#aeiouw'; },
    {cause: TypeError},
    `color #4: must be set to valid color`);
});

t.test(`Track.commentatorArtists`, t => {
  const {Artist, Track} = thingConstructors;

  t.plan(8);

  const wikiData = stubWikiData();

  const track = stubThing(wikiData, Track);
  const artist1 = stubThing(wikiData, Artist, {name: `SnooPING`});
  const artist2 = stubThing(wikiData, Artist, {name: `ASUsual`});
  const artist3 = stubThing(wikiData, Artist, {name: `Icy`});

  linkAndBindWikiData(wikiData);

  // Keep track of the last commentary string in a separate value, since
  // the track.commentary property exposes as a completely different format
  // (i.e. an array of objects, one for each entry), and so isn't compatible
  // with the += operator on its own.
  let commentary;

  track.commentary = commentary =
    `<i>SnooPING:</i>\n` +
    `Wow.\n`;

  t.same(track.commentatorArtists, [artist1],
    `Track.commentatorArtists #1: works with one commentator`);

  track.commentary = commentary +=
    `<i>ASUsual:</i>\n` +
    `Yes!\n`;

  t.same(track.commentatorArtists, [artist1, artist2],
    `Track.commentatorArtists #2: works with two commentators`);

  track.commentary = commentary +=
    `<i>Icy|<b>Icy annotation You Did There</b>:</i>\n` +
    `Incredible.\n`;

  t.same(track.commentatorArtists, [artist1, artist2, artist3],
    `Track.commentatorArtists #3: works with custom artist text`);

  track.commentary = commentary =
    `<i>Icy:</i> (project manager)\n` +
    `Very good track.\n`;

  t.same(track.commentatorArtists, [artist3],
    `Track.commentatorArtists #4: works with annotation`);

  track.commentary = commentary =
    `<i>Icy:</i> (project manager, 08/15/2023)\n` +
    `Very very good track.\n`;

  t.same(track.commentatorArtists, [artist3],
    `Track.commentatorArtists #5: works with date`);

  track.commentary = commentary +=
    `<i>Ohohohoho:</i>\n` +
    `OHOHOHOHOHOHO...\n`;

  t.same(track.commentatorArtists, [artist3],
    `Track.commentatorArtists #6: ignores artist names not found`);

  track.commentary = commentary +=
    `<i>Icy:</i>\n` +
    `I'm back!\n`;

  t.same(track.commentatorArtists, [artist3],
    `Track.commentatorArtists #7: ignores duplicate artist`);

  track.commentary = commentary +=
    `<i>SNooPING, ASUsual, Icy:</i>\n` +
    `WITH ALL THREE POWERS COMBINED...`;

  t.same(track.commentatorArtists, [artist3, artist1, artist2],
    `Track.commentatorArtists #8: works with more than one artist in one entry`);
});

t.test(`Track.coverArtistContribs`, t => {
  const {Artist} = thingConstructors;

  t.plan(5);

  const wikiData = stubWikiData();

  const {track, album} = stubTrackAndAlbum(wikiData);
  const artist1 = stubThing(wikiData, Artist, {name: `Artist 1`});
  const artist2 = stubThing(wikiData, Artist, {name: `Artist 2`});

  const {XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

  t.same(track.coverArtistContribs, [],
    `coverArtistContribs #1: defaults to empty array`);

  album.trackCoverArtistContribs = [
    {artist: `Artist 1`, annotation: `lines`},
    {artist: `Artist 2`, annotation: null},
  ];

  XXX_decacheWikiData();

  t.match(track.coverArtistContribs,
    [{artist: artist1, annotation: `lines`}, {artist: artist2, annotation: null}],
    `coverArtistContribs #2: inherits album trackCoverArtistContribs`);

  track.coverArtistContribs = [
    {artist: `Artist 1`, annotation: `collage`},
  ];

  t.match(track.coverArtistContribs, [{artist: artist1, annotation: `collage`}],
    `coverArtistContribs #3: resolves from own value`);

  track.coverArtistContribs = [
    {artist: `Artist 1`, annotation: `snooping`},
    {artist: `Artist 413`, annotation: `as`},
    {artist: `Artist 2`, annotation: `usual`},
  ];

  t.match(track.coverArtistContribs,
    [{artist: artist1, annotation: `snooping`}, {artist: artist2, annotation: `usual`}],
    `coverArtistContribs #4: filters out names without matches`);

  track.disableUniqueCoverArt = true;

  t.same(track.coverArtistContribs, [],
    `coverArtistContribs #5: is empty if track disables unique cover artwork`);
});

t.test(`Track.coverArtDate`, t => {
  t.plan(8);

  const wikiData = stubWikiData();

  const {track, album} = stubTrackAndAlbum(wikiData);
  const {contribs, badContribs} = stubArtistAndContribs(wikiData);

  const {XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

  track.coverArtistContribs = contribs;

  t.equal(track.coverArtDate, null,
    `coverArtDate #1: defaults to null`);

  album.trackArtDate = new Date('2012-12-12');

  XXX_decacheWikiData();

  t.same(track.coverArtDate, new Date('2012-12-12'),
    `coverArtDate #2: inherits album trackArtDate`);

  track.coverArtDate = new Date('2009-09-09');

  t.same(track.coverArtDate, new Date('2009-09-09'),
    `coverArtDate #3: is own value`);

  track.coverArtistContribs = [];

  t.equal(track.coverArtDate, null,
    `coverArtDate #4: is null if track coverArtistContribs empty`);

  album.trackCoverArtistContribs = contribs;

  XXX_decacheWikiData();

  t.same(track.coverArtDate, new Date('2009-09-09'),
    `coverArtDate #5: is not null if album trackCoverArtistContribs specified`);

  album.trackCoverArtistContribs = badContribs;

  XXX_decacheWikiData();

  t.equal(track.coverArtDate, null,
    `coverArtDate #6: is null if album trackCoverArtistContribs resolves empty`);

  track.coverArtistContribs = badContribs;

  t.equal(track.coverArtDate, null,
    `coverArtDate #7: is null if track coverArtistContribs resolves empty`);

  track.coverArtistContribs = contribs;
  track.disableUniqueCoverArt = true;

  t.equal(track.coverArtDate, null,
    `coverArtDate #8: is null if track disables unique cover artwork`);
});

t.test(`Track.coverArtFileExtension`, t => {
  t.plan(8);

  const wikiData = stubWikiData();

  const {track, album} = stubTrackAndAlbum(wikiData);
  const {contribs} = stubArtistAndContribs(wikiData);

  const {XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

  t.equal(track.coverArtFileExtension, null,
    `coverArtFileExtension #1: defaults to null`);

  track.coverArtistContribs = contribs;

  t.equal(track.coverArtFileExtension, 'jpg',
    `coverArtFileExtension #2: is jpg if has cover art and not further specified`);

  track.coverArtistContribs = [];

  album.coverArtistContribs = contribs;
  XXX_decacheWikiData();

  t.equal(track.coverArtFileExtension, null,
    `coverArtFileExtension #3: only has value for unique cover art`);

  track.coverArtistContribs = contribs;

  album.trackCoverArtFileExtension = 'png';
  XXX_decacheWikiData();

  t.equal(track.coverArtFileExtension, 'png',
    `coverArtFileExtension #4: inherits album trackCoverArtFileExtension (1/2)`);

  track.coverArtFileExtension = 'gif';

  t.equal(track.coverArtFileExtension, 'gif',
    `coverArtFileExtension #5: is own value (1/2)`);

  track.coverArtistContribs = [];

  album.trackCoverArtistContribs = contribs;
  XXX_decacheWikiData();

  t.equal(track.coverArtFileExtension, 'gif',
    `coverArtFileExtension #6: is own value (2/2)`);

  track.coverArtFileExtension = null;

  t.equal(track.coverArtFileExtension, 'png',
    `coverArtFileExtension #7: inherits album trackCoverArtFileExtension (2/2)`);

  track.disableUniqueCoverArt = true;

  t.equal(track.coverArtFileExtension, null,
    `coverArtFileExtension #8: is null if track disables unique cover art`);
});

t.test(`Track.date`, t => {
  t.plan(3);

  const wikiData = stubWikiData();

  const {track, album} = stubTrackAndAlbum(wikiData);

  const {XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

  t.equal(track.date, null,
    `date #1: defaults to null`);

  album.date = new Date('2012-12-12');
  XXX_decacheWikiData();

  t.same(track.date, album.date,
    `date #2: inherits from album`);

  track.dateFirstReleased = new Date('2009-09-09');

  t.same(track.date, new Date('2009-09-09'),
    `date #3: is own dateFirstReleased`);
});

t.test(`Track.featuredInFlashes`, t => {
  t.plan(2);

  const wikiData = stubWikiData();

  const {track} = stubTrackAndAlbum(wikiData, 'track1');
  const {flash: flash1} = stubFlashAndAct(wikiData, 'flash1');
  const {flash: flash2} = stubFlashAndAct(wikiData, 'flash2');

  const {XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

  t.same(track.featuredInFlashes, [],
    `featuredInFlashes #1: defaults to empty array`);

  flash1.featuredTracks = ['track:track1'];
  flash2.featuredTracks = ['track:track1'];
  XXX_decacheWikiData();

  t.same(track.featuredInFlashes, [flash1, flash2],
    `featuredInFlashes #2: matches flashes' featuredTracks`);
});

t.test(`Track.hasUniqueCoverArt`, t => {
  t.plan(7);

  const wikiData = stubWikiData();

  const {track, album} = stubTrackAndAlbum(wikiData);
  const {contribs, badContribs} = stubArtistAndContribs(wikiData);

  const {XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

  t.equal(track.hasUniqueCoverArt, false,
    `hasUniqueCoverArt #1: defaults to false`);

  album.trackCoverArtistContribs = contribs;
  XXX_decacheWikiData();

  t.equal(track.hasUniqueCoverArt, true,
    `hasUniqueCoverArt #2: is true if album specifies trackCoverArtistContribs`);

  track.disableUniqueCoverArt = true;

  t.equal(track.hasUniqueCoverArt, false,
    `hasUniqueCoverArt #3: is false if disableUniqueCoverArt is true (1/2)`);

  track.disableUniqueCoverArt = false;

  album.trackCoverArtistContribs = badContribs;
  XXX_decacheWikiData();

  t.equal(track.hasUniqueCoverArt, false,
    `hasUniqueCoverArt #4: is false if album's trackCoverArtistContribs resolve empty`);

  track.coverArtistContribs = contribs;

  t.equal(track.hasUniqueCoverArt, true,
    `hasUniqueCoverArt #5: is true if track specifies coverArtistContribs`);

  track.disableUniqueCoverArt = true;

  t.equal(track.hasUniqueCoverArt, false,
    `hasUniqueCoverArt #6: is false if disableUniqueCoverArt is true (2/2)`);

  track.disableUniqueCoverArt = false;

  track.coverArtistContribs = badContribs;

  t.equal(track.hasUniqueCoverArt, false,
    `hasUniqueCoverArt #7: is false if track's coverArtistContribs resolve empty`);
});

t.test(`Track.originalReleaseTrack`, t => {
  t.plan(3);

  const wikiData = stubWikiData();

  const {track: track1} = stubTrackAndAlbum(wikiData, 'track1');
  const {track: track2} = stubTrackAndAlbum(wikiData, 'track2');

  linkAndBindWikiData(wikiData);

  t.equal(track2.originalReleaseTrack, null,
    `originalReleaseTrack #1: defaults to null`);

  track2.originalReleaseTrack = 'track:track1';

  t.equal(track2.originalReleaseTrack, track1,
    `originalReleaseTrack #2: is resolved from own value`);

  track2.trackData = [];

  t.equal(track2.originalReleaseTrack, null,
    `originalReleaseTrack #3: is null when track missing trackData`);
});

t.test(`Track.otherReleases`, t => {
  t.plan(6);

  const wikiData = stubWikiData();

  const {track: track1} = stubTrackAndAlbum(wikiData, 'track1');
  const {track: track2} = stubTrackAndAlbum(wikiData, 'track2');
  const {track: track3} = stubTrackAndAlbum(wikiData, 'track3');
  const {track: track4} = stubTrackAndAlbum(wikiData, 'track4');

  const {linkWikiDataArrays, XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

  t.same(track1.otherReleases, [],
    `otherReleases #1: defaults to empty array`);

  track2.originalReleaseTrack = 'track:track1';
  track3.originalReleaseTrack = 'track:track1';
  track4.originalReleaseTrack = 'track:track1';
  XXX_decacheWikiData();

  t.same(track1.otherReleases, [track2, track3, track4],
    `otherReleases #2: otherReleases of original release are its rereleases`);

  wikiData.trackData = [track1, track3, track2, track4];
  linkWikiDataArrays();

  t.same(track1.otherReleases, [track3, track2, track4],
    `otherReleases #3: otherReleases matches trackData order`);

  wikiData.trackData = [track3, track2, track1, track4];
  linkWikiDataArrays();

  t.same(track2.otherReleases, [track1, track3, track4],
    `otherReleases #4: otherReleases of rerelease are original track then other rereleases (1/3)`);

  t.same(track3.otherReleases, [track1, track2, track4],
    `otherReleases #5: otherReleases of rerelease are original track then other rereleases (2/3)`);

  t.same(track4.otherReleases, [track1, track3, track2],
    `otherReleases #6: otherReleases of rerelease are original track then other rereleases (3/3)`);
});

t.test(`Track.referencedByTracks`, t => {
  t.plan(4);

  const wikiData = stubWikiData();

  const {track: track1} = stubTrackAndAlbum(wikiData, 'track1');
  const {track: track2} = stubTrackAndAlbum(wikiData, 'track2');
  const {track: track3} = stubTrackAndAlbum(wikiData, 'track3');
  const {track: track4} = stubTrackAndAlbum(wikiData, 'track4');

  const {XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

  t.same(track1.referencedByTracks, [],
    `referencedByTracks #1: defaults to empty array`);

  track2.referencedTracks = ['track:track1'];
  track3.referencedTracks = ['track:track1'];
  XXX_decacheWikiData();

  t.same(track1.referencedByTracks, [track2, track3],
    `referencedByTracks #2: matches tracks' referencedTracks`);

  track4.sampledTracks = ['track:track1'];
  XXX_decacheWikiData();

  t.same(track1.referencedByTracks, [track2, track3],
    `referencedByTracks #3: doesn't match tracks' sampledTracks`);

  track3.originalReleaseTrack = 'track:track2';
  XXX_decacheWikiData();

  t.same(track1.referencedByTracks, [track2],
    `referencedByTracks #4: doesn't include rereleases`);
});

t.test(`Track.sampledByTracks`, t => {
  t.plan(4);

  const wikiData = stubWikiData();

  const {track: track1} = stubTrackAndAlbum(wikiData, 'track1');
  const {track: track2} = stubTrackAndAlbum(wikiData, 'track2');
  const {track: track3} = stubTrackAndAlbum(wikiData, 'track3');
  const {track: track4} = stubTrackAndAlbum(wikiData, 'track4');

  const {XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

  t.same(track1.sampledByTracks, [],
    `sampledByTracks #1: defaults to empty array`);

  track2.sampledTracks = ['track:track1'];
  track3.sampledTracks = ['track:track1'];
  XXX_decacheWikiData();

  t.same(track1.sampledByTracks, [track2, track3],
    `sampledByTracks #2: matches tracks' sampledTracks`);

  track4.referencedTracks = ['track:track1'];
  XXX_decacheWikiData();

  t.same(track1.sampledByTracks, [track2, track3],
    `sampledByTracks #3: doesn't match tracks' referencedTracks`);

  track3.originalReleaseTrack = 'track:track2';
  XXX_decacheWikiData();

  t.same(track1.sampledByTracks, [track2],
    `sampledByTracks #4: doesn't include rereleases`);
});
