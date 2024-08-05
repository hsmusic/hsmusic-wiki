import t from 'tap';

import thingConstructors from '#things';

import {
  linkAndBindWikiData,
  stubArtistAndContribs,
  stubThing,
  stubWikiData,
} from '#test-lib';

t.test(`Album.artTags`, t => {
  const {Album, ArtTag} = thingConstructors;

  t.plan(3);

  const wikiData = stubWikiData();

  const {contribs} = stubArtistAndContribs(wikiData);
  const album = stubThing(wikiData, Album);
  const tag1 = stubThing(wikiData, ArtTag, {name: `Tag 1`});
  const tag2 = stubThing(wikiData, ArtTag, {name: `Tag 2`});

  linkAndBindWikiData(wikiData);

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
  const {Album} = thingConstructors;

  t.plan(4);

  const wikiData = stubWikiData();

  const album = stubThing(wikiData, Album);
  const {contribs, badContribs} = stubArtistAndContribs(wikiData);

  linkAndBindWikiData(wikiData);

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
  const {Album} = thingConstructors;

  t.plan(5);

  const wikiData = stubWikiData();

  const album = stubThing(wikiData, Album);
  const {contribs, badContribs} = stubArtistAndContribs(wikiData);

  linkAndBindWikiData(wikiData);

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
  const {Album} = thingConstructors;

  t.plan(4);

  const wikiData = stubWikiData();

  const album = stubThing(wikiData, Album);
  const {contribs, badContribs} = stubArtistAndContribs(wikiData);

  linkAndBindWikiData(wikiData);

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
  const {Album} = thingConstructors;

  t.plan(6);

  const wikiData = stubWikiData();

  const album = stubThing(wikiData, Album);
  const {contribs, badContribs} = stubArtistAndContribs(wikiData);

  linkAndBindWikiData(wikiData);

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
  const {Album} = thingConstructors;

  t.plan(5);

  const wikiData = stubWikiData();

  const album = stubThing(wikiData, Album);
  const {contribs, badContribs} = stubArtistAndContribs(wikiData);

  linkAndBindWikiData(wikiData);

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
  const {Album, Track, TrackSection} = thingConstructors;

  t.plan(4);

  let wikiData = stubWikiData();

  const album = stubThing(wikiData, Album);
  album.directory = 'foo';

  const track1 = stubThing(wikiData, Track, {directory: 'track1'});
  const track2 = stubThing(wikiData, Track, {directory: 'track2'});
  const track3 = stubThing(wikiData, Track, {directory: 'track3'});
  const tracks = [track1, track2, track3];

  const section1 = stubThing(wikiData, TrackSection, {unqualifiedDirectory: 'section1'});
  const section2 = stubThing(wikiData, TrackSection, {unqualifiedDirectory: 'section2'});
  const section3 = stubThing(wikiData, TrackSection, {unqualifiedDirectory: 'section3'});
  const section4 = stubThing(wikiData, TrackSection, {unqualifiedDirectory: 'section4'});
  const section5 = stubThing(wikiData, TrackSection, {unqualifiedDirectory: 'section5'});
  const section6 = stubThing(wikiData, TrackSection, {unqualifiedDirectory: 'section6'});
  const sections = [section1, section2, section3, section4, section5, section6];

  wikiData = null;

  for (const track of tracks) {
    track.albumData = [album];
  }

  for (const section of sections) {
    section.albumData = [album];
  }

  t.same(album.tracks, [],
    `Album.tracks #1: defaults to empty array`);

  section1.tracks = [track1, track2, track3];

  album.trackSections = [section1];

  t.same(album.tracks, [track1, track2, track3],
    `Album.tracks #2: pulls tracks from one track section`);

  section1.tracks = [track1];
  section2.tracks = [track2, track3];

  album.trackSections = [section1, section2];

  t.same(album.tracks, [track1, track2, track3],
    `Album.tracks #3: pulls tracks from multiple track sections`);

  section1.tracks = [track1];
  section2.tracks = [];
  section3.tracks = [track2];
  section4.tracks = [];
  section5.tracks = [];
  section6.tracks = [track3];

  album.trackSections = [section1, section2, section3, section4, section5, section6];

  t.same(album.tracks, [track1, track2, track3],
    `Album.tracks #4: skips empty track sections`);
});

t.test(`Album.trackSections`, t => {
  const {Album, Track, TrackSection} = thingConstructors;

  t.plan(7);

  let wikiData = stubWikiData();

  const album = stubThing(wikiData, Album);

  const track1 = stubThing(wikiData, Track, {directory: 'track1'});
  const track2 = stubThing(wikiData, Track, {directory: 'track2'});
  const track3 = stubThing(wikiData, Track, {directory: 'track3'});
  const track4 = stubThing(wikiData, Track, {directory: 'track4'});
  const tracks = [track1, track2, track3, track4];

  const section1 = stubThing(wikiData, TrackSection, {unqualifiedDirectory: 'section1'});
  const section2 = stubThing(wikiData, TrackSection, {unqualifiedDirectory: 'section2'});
  const section3 = stubThing(wikiData, TrackSection, {unqualifiedDirectory: 'section3'});
  const section4 = stubThing(wikiData, TrackSection, {unqualifiedDirectory: 'section4'});
  const section5 = stubThing(wikiData, TrackSection, {unqualifiedDirectory: 'section5'});
  const sections = [section1, section2, section3, section4, section5];

  wikiData = null;

  for (const track of tracks) {
    track.albumData = [album];
  }

  for (const section of sections) {
    section.albumData = [album];
  }

  section1.tracks = [track1, track2];
  section2.tracks = [track3, track4];

  album.trackSections = [section1, section2];

  t.match(album.trackSections, [
    {tracks: [track1, track2]},
    {tracks: [track3, track4]},
  ], `Album.trackSections #1: exposes tracks`);

  t.match(album.trackSections, [
    {tracks: [track1, track2], startIndex: 0},
    {tracks: [track3, track4], startIndex: 2},
  ], `Album.trackSections #2: exposes startIndex`);

  section1.tracks = [track1];
  section2.tracks = [track2];
  section3.tracks = [track3];

  section1.name = 'First section';
  section2.name = 'Second section';

  album.trackSections = [section1, section2, section3];

  t.match(album.trackSections, [
    {name: 'First section', tracks: [track1]},
    {name: 'Second section', tracks: [track2]},
    {name: 'Unnamed Track Section', tracks: [track3]},
  ], `Album.trackSections #3: exposes name, with fallback value`);

  album.color = '#123456';

  section2.color = '#abcdef';

  // XXX_decacheWikiData
  album.trackSections = [];
  album.trackSections = [section1, section2, section3];

  t.match(album.trackSections, [
    {tracks: [track1], color: '#123456'},
    {tracks: [track2], color: '#abcdef'},
    {tracks: [track3], color: '#123456'},
  ], `Album.trackSections #4: exposes color, inherited from album`);

  section2.dateOriginallyReleased = new Date('2009-04-11');

  // XXX_decacheWikiData
  album.trackSections = [];
  album.trackSections = [section1, section2, section3];

  t.match(album.trackSections, [
    {tracks: [track1], dateOriginallyReleased: null},
    {tracks: [track2], dateOriginallyReleased: new Date('2009-04-11')},
    {tracks: [track3], dateOriginallyReleased: null},
  ], `Album.trackSections #5: exposes dateOriginallyReleased, if present`);

  section1.isDefaultTrackSection = true;
  section2.isDefaultTrackSection = false;

  // XXX_decacheWikiData
  album.trackSections = [];
  album.trackSections = [section1, section2, section3];

  t.match(album.trackSections, [
    {tracks: [track1], isDefaultTrackSection: true},
    {tracks: [track2], isDefaultTrackSection: false},
    {tracks: [track3], isDefaultTrackSection: false},
  ], `Album.trackSections #6: exposes isDefaultTrackSection, defaults to false`);

  section1.tracks = [track1, track2];
  section2.tracks = [track3];
  section3.tracks = [];
  section4.tracks = [];
  section5.tracks = [track4];

  section1.color = '#112233';
  section2.color = '#334455';
  section3.color = '#bbbbba';
  section4.color = '#556677';
  section5.color = '#778899';

  album.trackSections = [section1, section2, section3, section4, section5];

  t.match(album.trackSections, [
    {tracks: [track1, track2], color: '#112233'},
    {tracks: [track3],         color: '#334455'},
    {tracks: [],               color: '#bbbbba'},
    {tracks: [],               color: '#556677'},
    {tracks: [track4],         color: '#778899'},
  ], `Album.trackSections #7: keeps empty sections`);
});

t.test(`Album.wallpaperFileExtension`, t => {
  const {Album} = thingConstructors;

  t.plan(5);

  const wikiData = stubWikiData();

  const album = stubThing(wikiData, Album);
  const {contribs, badContribs} = stubArtistAndContribs(wikiData);

  linkAndBindWikiData(wikiData);

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
  const {Album} = thingConstructors;

  t.plan(4);

  const wikiData = stubWikiData();

  const album = stubThing(wikiData, Album);
  const {contribs, badContribs} = stubArtistAndContribs(wikiData);

  linkAndBindWikiData(wikiData);

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
