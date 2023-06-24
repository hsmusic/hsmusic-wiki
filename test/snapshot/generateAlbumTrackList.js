import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'generateAlbumTrackList (snapshot)', async (t, evaluate) => {
  await evaluate.load({
    mock: {
      generateAlbumTrackListItem: {
        extraDependencies: ['html'],
        data: track => track.name,
        generate: (name, {html}) =>
          html.tag('li', `Item: ${name}`),
      },
    },
  });

  const tracks = [
    {name: 'Track 1', duration: 20},
    {name: 'Track 2', duration: 30},
    {name: 'Track 3', duration: 40},
    {name: 'Track 4', duration: 5},
  ];

  evaluate.snapshot('basic behavior, with track sections', {
    name: 'generateAlbumTrackList',
    args: [{
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
      trackSections: [{isDefaultTrackSection: true, tracks}],
      tracks,
    }],
  });
});
