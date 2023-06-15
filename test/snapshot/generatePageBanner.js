import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'generatePageBanner (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('basic behavior', {
    name: 'generatePageBanner',
    slots: {
      path: ['media.albumBanner', 'cool-album', 'png'],
      alt: 'Very cool banner art.',
      dimensions: [800, 200],
    },
  });

  evaluate.snapshot('no dimensions', {
    name: 'generatePageBanner',
    slots: {
      path: ['media.albumBanner', 'cool-album', 'png'],
    },
  });
});
