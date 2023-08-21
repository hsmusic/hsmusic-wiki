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

t.test(`Track.coverArtDate`, t => {
  t.plan(6);

  const albumTrackArtDate = new Date('2012-12-12');
  const trackCoverArtDate = new Date('2009-09-09');
  const dummyContribs = [{who: 'Test Artist', what: null}]

  const track = new Track();
  track.directory = 'foo';
  track.coverArtistContribsByRef = dummyContribs;

  const album = stubAlbum([track]);

  const artist = new Artist();
  artist.name = 'Test Artist';

  track.albumData = [album];
  track.artistData = [artist];

  const XXX_CLEAR_TRACK_ALBUM_CACHE = () => {
    // XXX clear cache so change in album's property is reflected
    track.albumData = [];
    track.albumData = [album];
  };

  // 1. coverArtDate defaults to null

  t.equal(track.coverArtDate, null);

  // 2. coverArtDate inherits album trackArtDate

  album.trackArtDate = albumTrackArtDate;

  XXX_CLEAR_TRACK_ALBUM_CACHE();

  t.equal(track.coverArtDate, albumTrackArtDate);

  // 3. coverArtDate is own value

  track.coverArtDate = trackCoverArtDate;

  t.equal(track.coverArtDate, trackCoverArtDate);

  // 4. coverArtDate is null if track is missing coverArtists

  track.coverArtistContribsByRef = [];

  t.equal(track.coverArtDate, null);

  // 5. coverArtDate is not null if album specifies trackCoverArtistContribs

  album.trackCoverArtistContribsByRef = dummyContribs;

  XXX_CLEAR_TRACK_ALBUM_CACHE();

  t.equal(track.coverArtDate, trackCoverArtDate);

  // 6. coverArtDate is null if track disables unique cover artwork

  track.disableUniqueCoverArt = true;

  t.equal(track.coverArtDate, null);
});
