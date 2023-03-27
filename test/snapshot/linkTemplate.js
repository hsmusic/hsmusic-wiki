import t from 'tap';

import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'linkTemplate', (t, evaluate) => {
  evaluate.snapshot({
    name: 'linkTemplate',
    extraDependencies: {
      getColors: c => ({primary: c + 'ff', dim: c + '77'}),
    },
  },
    v => v
      .slot('color', '#123456')
      .slot('href', 'https://hsmusic.wiki/media/cool file.pdf')
      .slot('hash', 'fooey')
      .slot('attributes', {class: 'dog', id: 'cat1'})
      .slot('content', 'My Cool Link'));

  evaluate.snapshot({
    name: 'linkTemplate',
    extraDependencies: {
      to: (...path) => '/c*lzone/' + path.join('/') + '/',
      appendIndexHTML: true,
    },
  },
    v => v
      .slot('path', ['myCoolPath', 'ham', 'pineapple', 'tomato']));
});
