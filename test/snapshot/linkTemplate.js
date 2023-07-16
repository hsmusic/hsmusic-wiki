import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'linkTemplate (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('fill many slots', {
    name: 'linkTemplate',

    extraDependencies: {
      getColors: c => ({primary: c + 'ff', dim: c + '77'}),
    },

    slots: {
      'color': '#123456',
      'href': 'https://hsmusic.wiki/media/cool file.pdf',
      'hash': 'fooey',
      'attributes': {class: 'dog', id: 'cat1'},
      'content': 'My Cool Link',
    },
  });

  evaluate.snapshot('fill path slot & provide appendIndexHTML', {
    name: 'linkTemplate',

    extraDependencies: {
      to: (...path) => '/c*lzone/' + path.join('/') + '/',
      appendIndexHTML: true,
    },

    slots: {
      path: ['myCoolPath', 'ham', 'pineapple', 'tomato'],
    },
  });

  evaluate.snapshot('special characters in path argument', {
    name: 'linkTemplate',
    slots: {
      path: [
        'media.albumAdditionalFile',
        'homestuck-vol-1',
        'Showtime (Piano Refrain) - #xXxAwesomeSheetMusick?rxXx#.pdf',
      ],
    },
  });
});
