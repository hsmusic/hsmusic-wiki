import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'generateAlbumTrackList (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  const contribs1 = [
    {who: {name: 'Apricot', directory: 'apricot', urls: null}},
  ];

  const contribs2 = [
    {who: {name: 'Apricot', directory: 'apricot', urls: null}},
    {who: {name: 'Peach', directory: 'peach', urls: ['https://peach.bandcamp.com/']}},
  ];

  const tracks = [
    {name: 'Track 1', directory: 't1', duration: 20, artistContribs: contribs1},
    {name: 'Track 2', directory: 't2', duration: 30, artistContribs: contribs1},
    {name: 'Track 3', directory: 't3', duration: 40, artistContribs: contribs1},
    {name: 'Track 4', directory: 't4', duration: 5, artistContribs: contribs2},
  ];

  evaluate.snapshot('basic behavior, with track sections', {
    name: 'generateAlbumTrackList',
    args: [{
      artistContribs: contribs1,
      trackSections: [
        {name: 'First section', tracks: tracks.slice(0, 3)},
        {name: 'Second section', tracks: tracks.slice(3)},
      ],
      tracks,
    }],
  });

  evaluate.snapshot('basic behavior, default track section', {
    name: 'generateAlbumTrackList',
    args: [{
      artistContribs: contribs1,
      trackSections: [{isDefaultTrackSection: true, tracks}],
      tracks,
    }],
  });
});
