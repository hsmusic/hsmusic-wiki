import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'generateAlbumCoverArtwork (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  const extraDependencies = {
    getSizeOfImageFile: () => 0,
  };

  const album = {
    directory: 'bee-forus-seatbelt-safebee',
    coverArtFileExtension: 'png',
    artTags: [
      {name: 'Damara', directory: 'damara', isContentWarning: false},
      {name: 'Cronus', directory: 'cronus', isContentWarning: false},
      {name: 'Bees', directory: 'bees', isContentWarning: false},
      {name: 'creepy crawlies', isContentWarning: true},
    ],
  };

  evaluate.snapshot('display: primary', {
    name: 'generateAlbumCoverArtwork',
    args: [album],
    slots: {displayMode: 'primary'},
    extraDependencies,
  });

  evaluate.snapshot('display: thumbnail', {
    name: 'generateAlbumCoverArtwork',
    args: [album],
    slots: {displayMode: 'thumbnail'},
    extraDependencies,
  });
});
