import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'generateTrackCoverArtwork (snapshot)', async (t, evaluate) => {
  await evaluate.load({
    mock: {
      image: evaluate.stubContentFunction('image'),
    },
  });

  const album = {
    directory: 'bee-forus-seatbelt-safebee',
    coverArtFileExtension: 'png',
    coverArtDimensions: [400, 300],
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
    coverArtDimensions: null,
    color: '#f28514',
    artTags: [{name: 'Bees', directory: 'bees', isContentWarning: false}],
    album,
  };

  const track2 = {
    directory: 'fake-bonus-track',
    hasUniqueCoverArt: false,
    color: '#abcdef',
    album,
  };

  evaluate.snapshot('display: primary - unique art', {
    name: 'generateTrackCoverArtwork',
    args: [track1],
    slots: {mode: 'primary'},
  });

  evaluate.snapshot('display: thumbnail - unique art', {
    name: 'generateTrackCoverArtwork',
    args: [track1],
    slots: {mode: 'thumbnail'},
  });

  evaluate.snapshot('display: primary - no unique art', {
    name: 'generateTrackCoverArtwork',
    args: [track2],
    slots: {mode: 'primary'},
  });

  evaluate.snapshot('display: thumbnail - no unique art', {
    name: 'generateTrackCoverArtwork',
    args: [track2],
    slots: {mode: 'thumbnail'},
  });
});
