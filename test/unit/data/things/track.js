import t from 'tap';

import {linkAndBindWikiData} from '#test-lib';
import thingConstructors from '#things';

const {
  Album,
  Artist,
  Thing,
  Track,
} = thingConstructors;

function stubAlbum(tracks, directory = 'bar') {
  const album = new Album();
  album.directory = directory;

  const tracksByRef = tracks.map(t => Thing.getReference(t));
  album.trackSections = [{tracksByRef}];

  return album;
}

function stubTrack(directory = 'foo') {
  const track = new Track();
  track.directory = directory;

  return track;
}

function stubTrackAndAlbum(trackDirectory = 'foo', albumDirectory = 'bar') {
  const track = stubTrack(trackDirectory);
  const album = stubAlbum([track], albumDirectory);
  return {track, album};
}

function stubArtistAndContribs() {
  const artist = new Artist();
  artist.name = `Test Artist`;

  const contribs = [{who: `Test Artist`, what: null}];
  const badContribs = [{who: `Figment of Your Imagination`, what: null}];

  return {artist, contribs, badContribs};
}

t.test(`Track.color`, t => {
  t.plan(3);

  const {track, album} = stubTrackAndAlbum();

  const {XXX_decacheWikiData} = linkAndBindWikiData({
    albumData: [album],
    trackData: [track],
  });

  t.equal(track.color, null,
    `color #1: defaults to null`);

  album.color = '#abcdef';
  XXX_decacheWikiData();

  t.equal(track.color, '#abcdef',
    `color #2: inherits from album`);

  track.color = '#123456';

  t.equal(track.color, '#123456',
    `color #3: is own value`);
});

t.test(`Track.coverArtDate`, t => {
  t.plan(6);

  const {track, album} = stubTrackAndAlbum();
  const {artist, contribs} = stubArtistAndContribs();

  const {XXX_decacheWikiData} = linkAndBindWikiData({
    trackData: [track],
    albumData: [album],
    artistData: [artist],
  });

  track.coverArtistContribsByRef = contribs;

  t.equal(track.coverArtDate, null,
    `coverArtDate #1: defaults to null`);

  album.trackArtDate = new Date('2012-12-12');

  XXX_decacheWikiData();

  t.same(track.coverArtDate, new Date('2012-12-12'),
    `coverArtDate #2: inherits album trackArtDate`);

  track.coverArtDate = new Date('2009-09-09');

  t.same(track.coverArtDate, new Date('2009-09-09'),
    `coverArtDate #3: is own value`);

  track.coverArtistContribsByRef = [];

  t.equal(track.coverArtDate, null,
    `coverArtDate #4: is null if track is missing coverArtists`);

  album.trackCoverArtistContribsByRef = contribs;

  XXX_decacheWikiData();

  t.same(track.coverArtDate, new Date('2009-09-09'),
    `coverArtDate #5: is not null if album specifies trackCoverArtistContribs`);

  track.disableUniqueCoverArt = true;

  t.equal(track.coverArtDate, null,
    `coverArtDate #6: is null if track disables unique cover artwork`);
});

t.test(`Track.date`, t => {
  t.plan(3);

  const {track, album} = stubTrackAndAlbum();

  const {XXX_decacheWikiData} = linkAndBindWikiData({
    albumData: [album],
    trackData: [track],
  });

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

t.test(`Track.hasUniqueCoverArt`, t => {
  t.plan(7);

  const {track, album} = stubTrackAndAlbum();
  const {artist, contribs, badContribs} = stubArtistAndContribs();

  const {XXX_decacheWikiData} = linkAndBindWikiData({
    albumData: [album],
    artistData: [artist],
    trackData: [track],
  });

  t.equal(track.hasUniqueCoverArt, false,
    `hasUniqueCoverArt #1: defaults to false`);

  album.trackCoverArtistContribsByRef = contribs;
  XXX_decacheWikiData();

  t.equal(track.hasUniqueCoverArt, true,
    `hasUniqueCoverArt #2: is true if album specifies trackCoverArtistContribs`);

  track.disableUniqueCoverArt = true;

  t.equal(track.hasUniqueCoverArt, false,
    `hasUniqueCoverArt #3: is false if disableUniqueCoverArt is true (1/2)`);

  track.disableUniqueCoverArt = false;

  album.trackCoverArtistContribsByRef = badContribs;
  XXX_decacheWikiData();

  t.equal(track.hasUniqueCoverArt, false,
    `hasUniqueCoverArt #4: is false if album's trackCoverArtistContribsByRef resolve empty`);

  track.coverArtistContribsByRef = contribs;

  t.equal(track.hasUniqueCoverArt, true,
    `hasUniqueCoverArt #5: is true if track specifies coverArtistContribs`);

  track.disableUniqueCoverArt = true;

  t.equal(track.hasUniqueCoverArt, false,
    `hasUniqueCoverArt #6: is false if disableUniqueCoverArt is true (2/2)`);

  track.disableUniqueCoverArt = false;

  track.coverArtistContribsByRef = badContribs;

  t.equal(track.hasUniqueCoverArt, false,
    `hasUniqueCoverArt #7: is false if track's coverArtistContribsByRef resolve empty`);
});

t.test(`Track.otherReleases`, t => {
  t.plan(6);

  const {track: track1, album: album1} = stubTrackAndAlbum('track1');
  const {track: track2, album: album2} = stubTrackAndAlbum('track2');
  const {track: track3, album: album3} = stubTrackAndAlbum('track3');
  const {track: track4, album: album4} = stubTrackAndAlbum('track4');

  const {wikiData, linkWikiDataArrays, XXX_decacheWikiData} = linkAndBindWikiData({
    trackData: [track1, track2, track3, track4],
    albumData: [album1, album2, album3, album4],
  });

  t.same(track1.otherReleases, [],
    `otherReleases #1: defaults to empty array`);

  track2.originalReleaseTrackByRef = 'track:track1';
  track3.originalReleaseTrackByRef = 'track:track1';
  track4.originalReleaseTrackByRef = 'track:track1';

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
    `otherReleases #6: otherReleases of rerelease are original track then other rereleases (1/3)`);
});
