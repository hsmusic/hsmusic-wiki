import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'generateTrackReleaseInfo (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  const artistContribs = [{artist: {name: 'Toby Fox', directory: 'toby-fox', urls: null}, annotation: null}];
  const coverArtistContribs = [{artist: {name: 'Alpaca', directory: 'alpaca', urls: null}, annotation: '🔥'}];

  evaluate.snapshot('basic behavior', {
    name: 'generateTrackReleaseInfo',
    args: [{
      artistContribs,
      name: 'An Apple Disaster!!',
      date: new Date('2011-11-30'),
      duration: 58,
      urls: ['https://soundcloud.com/foo', 'https://youtube.com/watch?v=bar'],
    }],
  });

  const sparse = {
    artistContribs,
    name: 'Suspicious Track',
    date: null,
    duration: null,
    urls: [],
  };

  evaluate.snapshot('reduced details', {
    name: 'generateTrackReleaseInfo',
    args: [sparse],
  });

  evaluate.snapshot('cover artist contribs, non-unique', {
    name: 'generateTrackReleaseInfo',
    args: [{
      ...sparse,
      coverArtistContribs,
      hasUniqueCoverArt: false,
    }],
  });

  evaluate.snapshot('cover artist contribs, unique', {
    name: 'generateTrackReleaseInfo',
    args: [{
      ...sparse,
      coverArtistContribs,
      hasUniqueCoverArt: true,
    }],
  });
});
