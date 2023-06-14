import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'generateCoverArtwork (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  const extraDependencies = {
    getSizeOfImageFile: () => 0,
  };

  const artTags = [
    {name: 'Damara', directory: 'damara', isContentWarning: false},
    {name: 'Cronus', directory: 'cronus', isContentWarning: false},
    {name: 'Bees', directory: 'bees', isContentWarning: false},
    {name: 'creepy crawlies', isContentWarning: true},
  ];

  const path = ['media.albumCover', 'bee-forus-seatbelt-safebee', 'png'];

  evaluate.snapshot('display: primary', {
    name: 'generateCoverArtwork',
    args: [artTags],
    slots: {path, mode: 'primary'},
    extraDependencies,
  });

  evaluate.snapshot('display: thumbnail', {
    name: 'generateCoverArtwork',
    args: [artTags],
    slots: {path, mode: 'thumbnail'},
    extraDependencies,
  });
});
