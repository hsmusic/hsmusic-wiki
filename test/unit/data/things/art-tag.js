import t from 'tap';

import {linkAndBindWikiData} from '#test-lib';
import thingConstructors from '#things';

const {
  Album,
  Artist,
  ArtTag,
  Track,
} = thingConstructors;

function stubAlbum(tracks, directory = 'bar') {
  const album = new Album();
  album.directory = directory;

  const trackRefs = tracks.map(t => Thing.getReference(t));
  album.trackSections = [{tracks: trackRefs}];

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

function stubArtist(artistName = `Test Artist`) {
  const artist = new Artist();
  artist.name = artistName;

  return artist;
}

function stubArtistAndContribs(artistName = `Test Artist`) {
  const artist = stubArtist(artistName);
  const contribs = [{who: artistName, what: null}];
  const badContribs = [{who: `Figment of Your Imagination`, what: null}];

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
