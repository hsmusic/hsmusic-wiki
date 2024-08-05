import t from 'tap';

import {linkAndBindWikiData} from '#test-lib';
import thingConstructors from '#things';

const {
  Album,
  Artist,
  ArtTag,
  Track,
  trackSection,
} = thingConstructors;

function stubAlbum(tracks, directory = 'bar') {
  const album = new Album();
  album.directory = directory;

  const trackSection = stubTrackSection(album, tracks);
  album.trackSections = [`unqualified-track-section:${trackSection.unqualifiedDirectory}`];
  album.ownTrackSectionData = [trackSection];

  return album;
}

function stubTrackSection(album, tracks, directory = 'baz') {
  const trackSection = new TrackSection();
  trackSection.unqualifiedDirectory = directory;
  trackSection.tracks = tracks;
  trackSection.albumData = [album];
  return trackSection;
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

function stubArtist(artistName = `Test Artist`) {
  const artist = new Artist();
  artist.name = artistName;

  return artist;
}

function stubArtistAndContribs(artistName = `Test Artist`) {
  const artist = stubArtist(artistName);
  const contribs = [{artist: artistName, annotation: null}];
  const badContribs = [{artist: `Figment of Your Imagination`, annotation: null}];

  return {artist, contribs, badContribs};
}

t.test(`ArtTag.nameShort`, t => {
  t.plan(3);

  const artTag = new ArtTag();

  artTag.name = `Dave Strider`;

  t.equal(artTag.nameShort, `Dave Strider`,
    `ArtTag #1: defaults to name`);

  artTag.name = `Dave Strider (Homestuck)`;

  t.equal(artTag.nameShort, `Dave Strider`,
    `ArtTag #2: trims parenthical part at end`);

  artTag.name = `This (And) That (Then)`;

  t.equal(artTag.nameShort, `This (And) That`,
    `ArtTag #2: doesn't trim midlde parenthical part`);
});
