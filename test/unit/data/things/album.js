import t from 'tap';

import {linkAndBindWikiData} from '#test-lib';
import thingConstructors from '#things';

const {
  Album,
  ArtTag,
  Artist,
  Track,
  TrackSection,
} = thingConstructors;

function stubArtTag(tagName = `Test Art Tag`) {
  const tag = new ArtTag();
  tag.name = tagName;

  return tag;
}

function stubArtistAndContribs() {
  const artist = new Artist();
  artist.name = `Test Artist`;

  const contribs = [{artist: `Test Artist`, annotation: null}];
  const badContribs = [{artist: `Figment of Your Imagination`, annotation: null}];

  return {artist, contribs, badContribs};
}

function stubTrack(directory = 'foo') {
  const track = new Track();
  track.directory = directory;

  return track;
}

function stubTrackSection(album, tracks, directory = 'baz') {
  const trackSection = new TrackSection();
  trackSection.unqualifiedDirectory = directory;
  trackSection.tracks = tracks.map(t => Thing.getReference(t));
  trackSection.ownTrackData = tracks;
  trackSection.ownAlbumData = [album];
  return trackSection;
}

t.test(`Album.artTags`, t => {
  t.plan(3);

  const {artist, contribs} = stubArtistAndContribs();
  const album = new Album();
  const tag1 = stubArtTag(`Tag 1`);
  const tag2 = stubArtTag(`Tag 2`);

  const {XXX_decacheWikiData} = linkAndBindWikiData({
    albumData: [album],
    artistData: [artist],
    artTagData: [tag1, tag2],
  });

  t.same(album.artTags, [],
    `artTags #1: defaults to empty array`);

  album.artTags = [`Tag 1`, `Tag 2`];

  t.same(album.artTags, [],
    `artTags #2: is empty if album doesn't have cover artists`);

  album.coverArtistContribs = contribs;

  t.same(album.artTags, [tag1, tag2],
    `artTags #3: resolves if album has cover artists`);
});

t.test(`Album.bannerDimensions`, t => {
  t.plan(4);

  const album = new Album();
  const {artist, contribs, badContribs} = stubArtistAndContribs();

  linkAndBindWikiData({
    albumData: [album],
    artistData: [artist],
  });

  t.equal(album.bannerDimensions, null,
    `Album.bannerDimensions #1: defaults to null`);

  album.bannerDimensions = [1200, 275];

  t.equal(album.bannerDimensions, null,
    `Album.bannerDimensions #2: is null if bannerArtistContribs empty`);

  album.bannerArtistContribs = badContribs;

  t.equal(album.bannerDimensions, null,
    `Album.bannerDimensions #3: is null if bannerArtistContribs resolves empty`);

  album.bannerArtistContribs = contribs;

  t.same(album.bannerDimensions, [1200, 275],
    `Album.bannerDimensions #4: is own value`);
});

t.test(`Album.bannerFileExtension`, t => {
  t.plan(5);

  const album = new Album();
  const {artist, contribs, badContribs} = stubArtistAndContribs();

  linkAndBindWikiData({
    albumData: [album],
    artistData: [artist],
  });

  t.equal(album.bannerFileExtension, null,
    `Album.bannerFileExtension #1: defaults to null`);

  album.bannerFileExtension = 'png';

  t.equal(album.bannerFileExtension, null,
    `Album.bannerFileExtension #2: is null if bannerArtistContribs empty`);

  album.bannerArtistContribs = badContribs;

  t.equal(album.bannerFileExtension, null,
    `Album.bannerFileExtension #3: is null if bannerArtistContribs resolves empty`);

  album.bannerArtistContribs = contribs;

  t.equal(album.bannerFileExtension, 'png',
    `Album.bannerFileExtension #4: is own value`);

  album.bannerFileExtension = null;

  t.equal(album.bannerFileExtension, 'jpg',
    `Album.bannerFileExtension #5: defaults to jpg`);
});

t.test(`Album.bannerStyle`, t => {
  t.plan(4);

  const album = new Album();
  const {artist, contribs, badContribs} = stubArtistAndContribs();

  linkAndBindWikiData({
    albumData: [album],
    artistData: [artist],
  });

  t.equal(album.bannerStyle, null,
    `Album.bannerStyle #1: defaults to null`);

  album.bannerStyle = `opacity: 0.5`;

  t.equal(album.bannerStyle, null,
    `Album.bannerStyle #2: is null if bannerArtistContribs empty`);

  album.bannerArtistContribs = badContribs;

  t.equal(album.bannerStyle, null,
    `Album.bannerStyle #3: is null if bannerArtistContribs resolves empty`);

  album.bannerArtistContribs = contribs;

  t.equal(album.bannerStyle, `opacity: 0.5`,
    `Album.bannerStyle #4: is own value`);
});

t.test(`Album.coverArtDate`, t => {
  t.plan(6);

  const album = new Album();
  const {artist, contribs, badContribs} = stubArtistAndContribs();

  linkAndBindWikiData({
    albumData: [album],
    artistData: [artist],
  });

  t.equal(album.coverArtDate, null,
    `Album.coverArtDate #1: defaults to null`);

  album.date = new Date('2012-10-25');

  t.equal(album.coverArtDate, null,
    `Album.coverArtDate #2: is null if coverArtistContribs empty (1/2)`);

  album.coverArtDate = new Date('2011-04-13');

  t.equal(album.coverArtDate, null,
    `Album.coverArtDate #3: is null if coverArtistContribs empty (2/2)`);

  album.coverArtistContribs = contribs;

  t.same(album.coverArtDate, new Date('2011-04-13'),
    `Album.coverArtDate #4: is own value`);

  album.coverArtDate = null;

  t.same(album.coverArtDate, new Date(`2012-10-25`),
    `Album.coverArtDate #5: inherits album release date`);

  album.coverArtistContribs = badContribs;

  t.equal(album.coverArtDate, null,
    `Album.coverArtDate #6: is null if coverArtistContribs resolves empty`);
});

t.test(`Album.coverArtFileExtension`, t => {
  t.plan(5);

  const album = new Album();
  const {artist, contribs, badContribs} = stubArtistAndContribs();

  linkAndBindWikiData({
    albumData: [album],
    artistData: [artist],
  });

  t.equal(album.coverArtFileExtension, null,
    `Album.coverArtFileExtension #1: is null if coverArtistContribs empty (1/2)`);

  album.coverArtFileExtension = 'png';

  t.equal(album.coverArtFileExtension, null,
    `Album.coverArtFileExtension #2: is null if coverArtistContribs empty (2/2)`);

  album.coverArtFileExtension = null;
  album.coverArtistContribs = contribs;

  t.equal(album.coverArtFileExtension, 'jpg',
    `Album.coverArtFileExtension #3: defaults to jpg`);

  album.coverArtFileExtension = 'png';

  t.equal(album.coverArtFileExtension, 'png',
    `Album.coverArtFileExtension #4: is own value`);

  album.coverArtistContribs = badContribs;

  t.equal(album.coverArtFileExtension, null,
    `Album.coverArtFileExtension #5: is null if coverArtistContribs resolves empty`);
});

t.test(`Album.tracks`, t => {
  t.plan(5);

  const album = new Album();
  album.directory = 'foo';

  const track1 = stubTrack('track1');
  const track2 = stubTrack('track2');
  const track3 = stubTrack('track3');
  const tracks = [track1, track2, track3];

  const section1 = stubTrackSection(album, [], 'section1');
  const section2 = stubTrackSection(album, [], 'section2');
  const section3 = stubTrackSection(album, [], 'section3');
  const section4 = stubTrackSection(album, [], 'section4');
  const section5 = stubTrackSection(album, [], 'section5');
  const section6 = stubTrackSection(album, [], 'section6');
  const sections = [section1, section2, section3, section4, section5, section6];

  const section1_ref = `unqualified-track-section:section1`;
  const section2_ref = `unqualified-track-section:section2`;
  const section3_ref = `unqualified-track-section:section3`;
  const section4_ref = `unqualified-track-section:section4`;
  const section5_ref = `unqualified-track-section:section5`;
  const section6_ref = `unqualified-track-section:section6`;

  for (const track of tracks) {
    track.albumData = [album];
  }

  for (const section of sections) {
    section.ownAlbumData = [album];
  }

  t.same(album.tracks, [],
    `Album.tracks #1: defaults to empty array`);

  section1.tracks = ['track:track1', 'track:track2', 'track:track3'];
  section1.ownTrackData = [track1, track2, track3];

  album.trackSections = [section1_ref];
  album.ownTrackSectionData = [section1];

  t.same(album.tracks, [track1, track2, track3],
    `Album.tracks #2: pulls tracks from one track section`);

  section1.tracks = ['track:track1'];
  section2.tracks = ['track:track2', 'track:track3'];

  section1.ownTrackData = [track1];
  section2.ownTrackData = [track2, track3];

  album.trackSections = [section1_ref, section2_ref];
  album.ownTrackSectionData = [section1, section2];

  t.same(album.tracks, [track1, track2, track3],
    `Album.tracks #3: pulls tracks from multiple track sections`);

  section1.tracks = ['track:track1', 'track:does-not-exist'];
  section2.tracks = ['track:this-one-neither', 'track:track2'];
  section3.tracks = ['track:effectively-empty-section'];
  section4.tracks = ['track:track3'];

  section1.ownTrackData = [track1];
  section2.ownTrackData = [track2];
  section3.ownTrackData = [];
  section4.ownTrackData = [track3];

  album.trackSections = [section1_ref, section2_ref, section3_ref, section4_ref];
  album.ownTrackSectionData = [section1, section2, section3, section4];

  t.same(album.tracks, [track1, track2, track3],
    `Album.tracks #4: filters out references without matches`);

  section1.tracks = ['track:track1'];
  section2.tracks = [];
  section3.tracks = ['track:track2'];
  section4.tracks = [];
  section5.tracks = [];
  section6.tracks = ['track:track3'];

  section1.ownTrackData = [track1];
  section2.ownTrackData = [];
  section3.ownTrackData = [track2];
  section4.ownTrackData = [];
  section5.ownTrackData = [];
  section6.ownTrackData = [track3];

  album.trackSections = [section1_ref, section2_ref, section3_ref, section4_ref, section5_ref, section6_ref];
  album.ownTrackSectionData = [section1, section2, section3, section4, section5, section6];

  t.same(album.tracks, [track1, track2, track3],
    `Album.tracks #5: skips empty track sections`);
});

t.test(`Album.trackSections`, t => {
  t.plan(7);

  const album = new Album();

  const track1 = stubTrack('track1');
  const track2 = stubTrack('track2');
  const track3 = stubTrack('track3');
  const track4 = stubTrack('track4');
  const tracks = [track1, track2, track3, track4];

  const section1 = stubTrackSection(album, [], 'section1');
  const section2 = stubTrackSection(album, [], 'section2');
  const section3 = stubTrackSection(album, [], 'section3');
  const section4 = stubTrackSection(album, [], 'section4');
  const section5 = stubTrackSection(album, [], 'section5');
  const sections = [section1, section2, section3, section4, section5];

  const section1_ref = `unqualified-track-section:section1`;
  const section2_ref = `unqualified-track-section:section2`;
  const section3_ref = `unqualified-track-section:section3`;
  const section4_ref = `unqualified-track-section:section4`;
  const section5_ref = `unqualified-track-section:section5`;

  for (const track of tracks) {
    track.albumData = [album];
  }

  section1.tracks = ['track:track1', 'track:track2'];
  section2.tracks = ['track:track3', 'track:track4'];

  section1.ownTrackData = [track1, track2];
  section2.ownTrackData = [track3, track4];

  album.trackSections = [section1_ref, section2_ref];
  album.ownTrackSectionData = [section1, section2];

  t.match(album.trackSections, [
    {tracks: [track1, track2]},
    {tracks: [track3, track4]},
  ], `Album.trackSections #1: exposes tracks`);

  t.match(album.trackSections, [
    {tracks: [track1, track2], startIndex: 0},
    {tracks: [track3, track4], startIndex: 2},
  ], `Album.trackSections #2: exposes startIndex`);

  section1.tracks = ['track:track1'];
  section2.tracks = ['track:track2'];
  section3.tracks = ['track:track3'];

  section1.ownTrackData = [track1];
  section2.ownTrackData = [track2];
  section3.ownTrackData = [track3];

  section1.name = 'First section';
  section2.name = 'Second section';

  album.trackSections = [section1_ref, section2_ref, section3_ref];
  album.ownTrackSectionData = [section1, section2, section3];

  t.match(album.trackSections, [
    {name: 'First section', tracks: [track1]},
    {name: 'Second section', tracks: [track2]},
    {name: 'Unnamed Track Section', tracks: [track3]},
  ], `Album.trackSections #3: exposes name, with fallback value`);

  album.color = '#123456';

  section2.color = '#abcdef';

  // XXX_decacheWikiData
  album.trackSections = [];
  album.trackSections = [section1_ref, section2_ref, section3_ref];

  t.match(album.trackSections, [
    {tracks: [track1], color: '#123456'},
    {tracks: [track2], color: '#abcdef'},
    {tracks: [track3], color: '#123456'},
  ], `Album.trackSections #4: exposes color, inherited from album`);

  section2.dateOriginallyReleased = new Date('2009-04-11');

  // XXX_decacheWikiData
  album.trackSections = [];
  album.trackSections = [section1_ref, section2_ref, section3_ref];

  t.match(album.trackSections, [
    {tracks: [track1], dateOriginallyReleased: null},
    {tracks: [track2], dateOriginallyReleased: new Date('2009-04-11')},
    {tracks: [track3], dateOriginallyReleased: null},
  ], `Album.trackSections #5: exposes dateOriginallyReleased, if present`);

  section1.isDefaultTrackSection = true;
  section2.isDefaultTrackSection = false;

  // XXX_decacheWikiData
  album.trackSections = [];
  album.trackSections = [section1_ref, section2_ref, section3_ref];

  t.match(album.trackSections, [
    {tracks: [track1], isDefaultTrackSection: true},
    {tracks: [track2], isDefaultTrackSection: false},
    {tracks: [track3], isDefaultTrackSection: false},
  ], `Album.trackSections #6: exposes isDefaultTrackSection, defaults to false`);

  section1.tracks = ['track:track1', 'track:track2', 'track:snooping'];
  section2.tracks = ['track:track3', 'track:as-usual'];
  section3.tracks = [];
  section4.tracks = ['track:icy', 'track:chilly', 'track:frigid'];
  section5.tracks = ['track:track4'];

  section1.ownTrackData = [track1, track2];
  section2.ownTrackData = [track3];
  section3.ownTrackData = [];
  section4.ownTrackData = [];
  section5.ownTrackData = [track4];

  section1.color = '#112233';
  section2.color = '#334455';
  section3.color = '#bbbbba';
  section4.color = '#556677';
  section5.color = '#778899';

  album.trackSections = [section1_ref, section2_ref, section3_ref, section4_ref, section5_ref];
  album.ownTrackSectionData = [section1, section2, section3, section4, section5];

  t.match(album.trackSections, [
    {tracks: [track1, track2], color: '#112233'},
    {tracks: [track3],         color: '#334455'},
    {tracks: [],               color: '#bbbbba'},
    {tracks: [],               color: '#556677'},
    {tracks: [track4],         color: '#778899'},
  ], `Album.trackSections #7: filters out references without matches, keeps empty sections`);
});

t.test(`Album.wallpaperFileExtension`, t => {
  t.plan(5);

  const album = new Album();
  const {artist, contribs, badContribs} = stubArtistAndContribs();

  linkAndBindWikiData({
    albumData: [album],
    artistData: [artist],
  });

  t.equal(album.wallpaperFileExtension, null,
    `Album.wallpaperFileExtension #1: defaults to null`);

  album.wallpaperFileExtension = 'png';

  t.equal(album.wallpaperFileExtension, null,
    `Album.wallpaperFileExtension #2: is null if wallpaperArtistContribs empty`);

  album.wallpaperArtistContribs = contribs;

  t.equal(album.wallpaperFileExtension, 'png',
    `Album.wallpaperFileExtension #3: is own value`);

  album.wallpaperFileExtension = null;

  t.equal(album.wallpaperFileExtension, 'jpg',
    `Album.wallpaperFileExtension #4: defaults to jpg`);

  album.wallpaperArtistContribs = badContribs;

  t.equal(album.wallpaperFileExtension, null,
    `Album.wallpaperFileExtension #5: is null if wallpaperArtistContribs resolves empty`);
});

t.test(`Album.wallpaperStyle`, t => {
  t.plan(4);

  const album = new Album();
  const {artist, contribs, badContribs} = stubArtistAndContribs();

  linkAndBindWikiData({
    albumData: [album],
    artistData: [artist],
  });

  t.equal(album.wallpaperStyle, null,
    `Album.wallpaperStyle #1: defaults to null`);

  album.wallpaperStyle = `opacity: 0.5`;

  t.equal(album.wallpaperStyle, null,
    `Album.wallpaperStyle #2: is null if wallpaperArtistContribs empty`);

  album.wallpaperArtistContribs = badContribs;

  t.equal(album.wallpaperStyle, null,
    `Album.wallpaperStyle #3: is null if wallpaperArtistContribs resolves empty`);

  album.wallpaperArtistContribs = contribs;

  t.equal(album.wallpaperStyle, `opacity: 0.5`,
    `Album.wallpaperStyle #4: is own value`);
});
