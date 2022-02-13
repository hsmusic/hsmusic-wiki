import test from 'tape';

import {
    Album,
    Thing,
    Track,
    TrackGroup,
} from '../src/data/things.js';

function stubAlbum(tracks) {
    const album = new Album();
    const trackGroup = new TrackGroup();
    trackGroup.tracksByRef = tracks.map(t => Thing.getReference(t));
    album.trackGroups = [trackGroup];
    album.trackData = tracks;
    return album;
}

test(`Track.coverArtDate`, t => {
    t.plan(5);

    // Priority order is as follows, with the last (trackCoverArtDate) being
    // greatest priority.
    const albumDate = new Date('2010-10-10');
    const albumTrackArtDate = new Date('2012-12-12');
    const trackDateFirstReleased = new Date('2008-08-08');
    const trackCoverArtDate = new Date('2009-09-09');

    const track = new Track();
    track.directory = 'foo';

    const album = stubAlbum([track]);

    track.albumData = [album];

    // 1. coverArtDate defaults to null

    t.is(track.coverArtDate, null);

    // 2. coverArtDate inherits album release date

    album.date = albumDate;

    // XXX clear cache so change in album's property is reflected
    track.albumData = [];
    track.albumData = [album];

    t.is(track.coverArtDate, albumDate);

    // 3. coverArtDate inherits album trackArtDate

    album.trackArtDate = albumTrackArtDate;

    // XXX clear cache again
    track.albumData = [];
    track.albumData = [album];

    t.is(track.coverArtDate, albumTrackArtDate);

    // 4. coverArtDate is overridden dateFirstReleased

    track.dateFirstReleased = trackDateFirstReleased;

    t.is(track.coverArtDate, trackDateFirstReleased);

    // 5. coverArtDate is overridden coverArtDate

    track.coverArtDate = trackCoverArtDate;

    t.is(track.coverArtDate, trackCoverArtDate);
});
