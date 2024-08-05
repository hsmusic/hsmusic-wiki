import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'generateAlbumTrackList (unit)', async (t, evaluate) => {
  await evaluate.load({
    mock: {
      generateAlbumTrackListItem: {
        extraDependencies: ['html'],
        data: track => track.name,
        generate: (name, {html}) =>
          html.tag('li', `Item: ${name}`),
      },

      image:
        evaluate.stubContentFunction('image'),
    },
  });

  let readDuration = false;

  const track = (name, duration) => ({
    name,
    get duration() {
      readDuration = true;
      return duration;
    },
  });

  const tracks = [
    track('Track 1', 30),
    track('Track 2', 15),
  ];

  evaluate({
    name: 'generateAlbumTrackList',
    args: [{
      trackSections: [{isDefaultTrackSection: true, tracks}],
      tracks,
    }],
  });

  t.notOk(readDuration, 'expect no access to track.duration property');
});
