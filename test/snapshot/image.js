import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

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
    postprocess: template => template
      .slot('path', ['media.albumCover', 'beyond-canon', 'png']),
  });

  quickSnapshot('source via src', {
    postprocess: template => template
      .slot('src', 'https://example.com/bananas.gif'),
  });

  quickSnapshot('source missing', {
    postprocess: template => template
      .slot('missingSourceContent', 'Example of missing source message.'),
  });

  quickSnapshot('id without link', {
    postprocess: template => template
      .slot('src', 'foobar')
      .slot('id', 'banana'),
  });

  quickSnapshot('id with link', {
    postprocess: template => template
      .slot('src', 'foobar')
      .slot('link', true)
      .slot('id', 'banana'),
  });

  quickSnapshot('id with square', {
    postprocess: template => template
      .slot('src', 'foobar')
      .slot('square', true)
      .slot('id', 'banana'),
  })

  quickSnapshot('width & height', {
    postprocess: template => template
      .slot('src', 'foobar')
      .slot('width', 600)
      .slot('height', 400),
  });

  quickSnapshot('square', {
    postprocess: template => template
      .slot('src', 'foobar')
      .slot('square', true),
  });

  quickSnapshot('lazy with square', {
    postprocess: template => template
      .slot('src', 'foobar')
      .slot('lazy', true)
      .slot('square', true),
  });

  quickSnapshot('link with file size', {
    extraDependencies: {
      getSizeOfImageFile: () => 10 ** 6,
    },

    postprocess: template => template
      .slot('path', ['media.albumCover', 'pingas', 'png'])
      .slot('link', true),
  });

  quickSnapshot('content warnings via tags', {
    args: [
      [
        {name: 'Dirk Strider', directory: 'dirk'},
        {name: 'too cool for school', isContentWarning: true},
      ],
    ],

    postprocess: template => template
      .slot('path', ['media.albumCover', 'beyond-canon', 'png']),
  })
});
