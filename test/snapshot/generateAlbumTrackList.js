import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'generateAlbumTrackList (snapshot)', async (t, evaluate) => {
  await evaluate.load({
    mock: {
      generateAlbumTrackListMissingDuration:
        evaluate.stubContentFunction('generateAlbumTrackListMissingDuration'),
    },
  });

  const contribs1 = [
    {who: {name: 'Apricot', directory: 'apricot', urls: null}},
  ];

  const contribs2 = [
    {who: {name: 'Apricot', directory: 'apricot', urls: null}},
    {who: {name: 'Peach', directory: 'peach', urls: ['https://peach.bandcamp.com/']}},
  ];

  const color1 = '#fb07ff';
  const color2 = '#ea2e83';

  const tracks = [
    {name: 'Track 1', directory: 't1', duration: 20, artistContribs: contribs1, color: color1},
    {name: 'Track 2', directory: 't2', duration: 0, artistContribs: contribs1, color: color1},
    {name: 'Track 3', directory: 't3', duration: 40, artistContribs: contribs1, color: color1},
    {name: 'Track 4', directory: 't4', duration: 0, artistContribs: contribs2, color: color2},
  ];

  const albumWithTrackSections = {
    color: color1,
    artistContribs: contribs1,
    trackSections: [
      {name: 'First section', tracks: tracks.slice(0, 3)},
      {name: 'Second section', tracks: tracks.slice(3)},
    ],
    tracks,
  };

  const albumWithoutTrackSections = {
    color: color1,
    artistContribs: contribs1,
    trackSections: [{isDefaultTrackSection: true, tracks}],
    tracks,
  };

  const albumWithNoDuration = {
    color: color1,
    artistContribs: contribs1,
    trackSections: [{isDefaultTrackSection: true, tracks: [tracks[1], tracks[3]]}],
    tracks: [tracks[1], tracks[3]],
  };

  evaluate.snapshot(`basic behavior, with track sections`, {
    name: 'generateAlbumTrackList',
    args: [albumWithTrackSections],
  });

  evaluate.snapshot(`basic behavior, default track section`, {
    name: 'generateAlbumTrackList',
    args: [albumWithoutTrackSections],
  });

  evaluate.snapshot(`collapseDurationScope: never`, {
    name: 'generateAlbumTrackList',
    slots: {collapseDurationScope: 'never'},
    multiple: [
      {args: [albumWithTrackSections]},
      {args: [albumWithoutTrackSections]},
      {args: [albumWithNoDuration]},
    ],
  });

  evaluate.snapshot(`collapseDurationScope: track`, {
    name: 'generateAlbumTrackList',
    slots: {collapseDurationScope: 'track'},
    multiple: [
      {args: [albumWithTrackSections]},
      {args: [albumWithoutTrackSections]},
      {args: [albumWithNoDuration]},
    ],
  });

  evaluate.snapshot(`collapseDurationScope: section`, {
    name: 'generateAlbumTrackList',
    slots: {collapseDurationScope: 'section'},
    multiple: [
      {args: [albumWithTrackSections]},
      {args: [albumWithoutTrackSections]},
      {args: [albumWithNoDuration]},
    ],
  });

  evaluate.snapshot(`collapseDurationScope: album`, {
    name: 'generateAlbumTrackList',
    slots: {collapseDurationScope: 'album'},
    multiple: [
      {args: [albumWithTrackSections]},
      {args: [albumWithoutTrackSections]},
      {args: [albumWithNoDuration]},
    ],
  });
});
