import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'generateCoverArtwork (snapshot)', async (t, evaluate) => {
  await evaluate.load({
    mock: {
      image: evaluate.stubContentFunction('image', {mock: true}),
    },
  });

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
  });

  evaluate.snapshot('display: thumbnail', {
    name: 'generateCoverArtwork',
    args: [artTags],
    slots: {path, mode: 'thumbnail'},
  });
});
