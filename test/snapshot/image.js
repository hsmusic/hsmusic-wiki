import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'image (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  const quickSnapshot = (message, opts) =>
    evaluate.snapshot(message, {
      name: 'image',
      extraDependencies: {
        getSizeOfImageFile: () => 0,
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
      getSizeOfImageFile: () => 10 ** 6,
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
});
