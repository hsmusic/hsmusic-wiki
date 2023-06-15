import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'generateAlbumBanner (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('basic behavior', {
    name: 'generateAlbumBanner',
    args: [{
      directory: 'cool-album',
      hasBannerArt: true,
      bannerDimensions: [800, 200],
      bannerFileExtension: 'png',
    }],
  });

  evaluate.snapshot('no dimensions', {
    name: 'generateAlbumBanner',
    args: [{
      directory: 'cool-album',
      hasBannerArt: true,
      bannerDimensions: null,
      bannerFileExtension: 'png',
    }],
  });

  evaluate.snapshot('no banner', {
    name: 'generateAlbumBanner',
    args: [{
      directory: 'cool-album',
      hasBannerArt: false,
    }],
  });
});
