import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'generateTrackCoverArtwork (snapshot)', async (t, evaluate) => {
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

  const track1 = {
    directory: 'beesmp3',
    hasUniqueCoverArt: true,
    coverArtFileExtension: 'jpg',
    artTags: [{name: 'Bees', directory: 'bees', isContentWarning: false}],
    album,
  };

  const track2 = {
    directory: 'fake-bonus-track',
    hasUniqueCoverArt: false,
    album,
  };

  evaluate.snapshot('display: primary - unique art', {
    name: 'generateTrackCoverArtwork',
    args: [track1],
    slots: {mode: 'primary'},
    extraDependencies,
  });

  evaluate.snapshot('display: thumbnail - unique art', {
    name: 'generateTrackCoverArtwork',
    args: [track1],
    slots: {mode: 'thumbnail'},
    extraDependencies,
  });

  evaluate.snapshot('display: primary - no unique art', {
    name: 'generateTrackCoverArtwork',
    args: [track2],
    slots: {mode: 'primary'},
    extraDependencies,
  });

  evaluate.snapshot('display: thumbnail - no unique art', {
    name: 'generateTrackCoverArtwork',
    args: [track2],
    slots: {mode: 'thumbnail'},
    extraDependencies,
  });
});
