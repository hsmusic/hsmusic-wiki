import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'image (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  const quickSnapshot = (message, {extraDependencies, ...opts}) =>
    evaluate.snapshot(message, {
      name: 'image',
      extraDependencies: {
        checkIfImagePathHasCachedThumbnails: path => !path.endsWith('.gif'),
        getSizeOfImagePath: () => 0,
        getDimensionsOfImagePath: () => [600, 600],
        getThumbnailEqualOrSmaller: () => 'medium',
        getThumbnailsAvailableForDimensions: () =>
          [['large', 800], ['medium', 400], ['small', 250]],
        ...extraDependencies,
      },
      ...opts,
    });

  quickSnapshot('source via path', {
    slots: {
      path: ['media.albumCover', 'beyond-canon', 'png'],
    },
  });

  quickSnapshot('source via src', {
    slots: {
      src: 'https://example.com/bananas.gif',
    },
  });

  quickSnapshot('source missing', {
    slots: {
      missingSourceContent: 'Example of missing source message.',
    },
  });

  quickSnapshot('id without link', {
    slots: {
      src: 'foobar',
      id: 'banana',
    },
  });

  quickSnapshot('id with link', {
    slots: {
      src: 'foobar',
      link: true,
      id: 'banana',
    },
  });

  quickSnapshot('id with square', {
    slots: {
      src: 'foobar',
      square: true,
      id: 'banana',
    },
  });

  quickSnapshot('width & height', {
    slots: {
      src: 'foobar',
      width: 600,
      height: 400,
    },
  });

  quickSnapshot('square', {
    slots: {
      src: 'foobar',
      square: true,
    },
  });

  quickSnapshot('lazy with square', {
    slots: {
      src: 'foobar',
      lazy: true,
      square: true,
    },
  });

  quickSnapshot('link with file size', {
    extraDependencies: {
      getSizeOfImagePath: () => 10 ** 6,
    },
    slots: {
      path: ['media.albumCover', 'pingas', 'png'],
      link: true,
    },
  });

  quickSnapshot('content warnings via tags', {
    args: [
      [
        {name: 'Dirk Strider', directory: 'dirk'},
        {name: 'too cool for school', isContentWarning: true},
      ],
    ],
    slots: {
      path: ['media.albumCover', 'beyond-canon', 'png'],
    },
  });

  evaluate.snapshot('thumbnail details', {
    name: 'image',
    extraDependencies: {
      checkIfImagePathHasCachedThumbnails: () => true,
      getSizeOfImagePath: () => 0,
      getDimensionsOfImagePath: () => [900, 1200],
      getThumbnailsAvailableForDimensions: () =>
        [['voluminous', 1200], ['middling', 900], ['petite', 20]],
      getThumbnailEqualOrSmaller: () => 'voluminous',
    },
    slots: {
      thumb: 'gargantuan',
      path: ['media.albumCover', 'beyond-canon', 'png'],
    },
  });

  quickSnapshot('thumb requested but source is gif', {
    slots: {
      thumb: 'medium',
      path: ['media.flashArt', '5426', 'gif'],
    },
  });
});
