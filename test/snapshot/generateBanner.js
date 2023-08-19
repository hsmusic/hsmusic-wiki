import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'generateBanner (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('basic behavior', {
    name: 'generateBanner',
    slots: {
      path: ['media.albumBanner', 'cool-album', 'png'],
      alt: 'Very cool banner art.',
      dimensions: [800, 200],
    },
  });

  evaluate.snapshot('no dimensions', {
    name: 'generateBanner',
    slots: {
      path: ['media.albumBanner', 'cool-album', 'png'],
    },
  });
});
