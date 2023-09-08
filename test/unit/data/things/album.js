import t from 'tap';

import {linkAndBindWikiData} from '#test-lib';
import thingConstructors from '#things';

const {
  Album,
  Artist,
  Thing,
  Track,
} = thingConstructors;

function stubArtistAndContribs() {
  const artist = new Artist();
  artist.name = `Test Artist`;

  const contribs = [{who: `Test Artist`, what: null}];
  const badContribs = [{who: `Figment of Your Imagination`, what: null}];

  return {artist, contribs, badContribs};
}

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
