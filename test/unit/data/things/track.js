import t from 'tap';
import thingConstructors from '#things';

const {
  Album,
  Artist,
  Thing,
  Track,
  TrackGroup,
} = thingConstructors;

function stubAlbum(tracks) {
  const album = new Album();
  album.trackSections = [
    {
      tracksByRef: tracks.map(t => Thing.getReference(t)),
    },
  ];
  album.trackData = tracks;
  return album;
}

function stubTrack() {
  const track = new Track();
  track.directory = 'foo';
  return track;
}

function stubTrackAndAlbum() {
  const track = stubTrack();
  const album = stubAlbum([track]);
  track.albumData = [album];
  return {track, album};
}

function stubArtistAndContribs() {
  const artist = new Artist();
  artist.name = `Test Artist`;

  const contribs = [{who: `Test Artist`, what: null}];
  const badContribs = [{who: `Figment of Your Imagination`, what: null}];
  return {artist, contribs, badContribs};
}

function XXX_CLEAR_TRACK_ALBUM_CACHE(track, album) {
  // XXX clear cache so change in album's property is reflected
  track.albumData = [];
  track.albumData = [album];
}

t.test(`Track.color`, t => {
  t.plan(3);

  const {track, album} = stubTrackAndAlbum();

  t.equal(track.color, null,
    `color #1: defaults to null`);

  album.color = '#abcdef';
  XXX_CLEAR_TRACK_ALBUM_CACHE(track, album);

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

  track.coverArtistContribsByRef = contribs;
  track.artistData = [artist];

  t.equal(track.coverArtDate, null,
    `coverArtDate #1: defaults to null`);

  album.trackArtDate = new Date('2012-12-12');
  XXX_CLEAR_TRACK_ALBUM_CACHE(track, album);

  t.same(track.coverArtDate, new Date('2012-12-12'),
    `coverArtDate #2: inherits album trackArtDate`);

  track.coverArtDate = new Date('2009-09-09');

  t.same(track.coverArtDate, new Date('2009-09-09'),
    `coverArtDate #3: is own value`);

  track.coverArtistContribsByRef = [];

  t.equal(track.coverArtDate, null,
    `coverArtDate #4: is null if track is missing coverArtists`);

  album.trackCoverArtistContribsByRef = contribs;
  XXX_CLEAR_TRACK_ALBUM_CACHE(track, album);

  t.same(track.coverArtDate, new Date('2009-09-09'),
    `coverArtDate #5: is not null if album specifies trackCoverArtistContribs`);

  track.disableUniqueCoverArt = true;

  t.equal(track.coverArtDate, null,
    `coverArtDate #6: is null if track disables unique cover artwork`);
});

t.test(`Track.date`, t => {
  t.plan(3);

  const {track, album} = stubTrackAndAlbum();

  t.equal(track.date, null,
    `date #1: defaults to null`);

  album.date = new Date('2012-12-12');
  XXX_CLEAR_TRACK_ALBUM_CACHE(track, album);

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

  track.artistData = [artist];
  album.artistData = [artist];

  t.equal(track.hasUniqueCoverArt, false,
    `hasUniqueCoverArt #1: defaults to false`);

  album.trackCoverArtistContribsByRef = contribs;
  XXX_CLEAR_TRACK_ALBUM_CACHE(track, album);

  t.equal(track.hasUniqueCoverArt, true,
    `hasUniqueCoverArt #2: is true if album specifies trackCoverArtistContribs`);

  track.disableUniqueCoverArt = true;

  t.equal(track.hasUniqueCoverArt, false,
    `hasUniqueCoverArt #3: is false if disableUniqueCoverArt is true (1/2)`);

  track.disableUniqueCoverArt = false;

  album.trackCoverArtistContribsByRef = badContribs;
  XXX_CLEAR_TRACK_ALBUM_CACHE(track, album);

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
