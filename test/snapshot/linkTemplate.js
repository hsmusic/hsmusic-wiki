import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'linkTemplate (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('fill many slots', {
    name: 'linkTemplate',

    extraDependencies: {
      getColors: c => ({primary: c + 'ff', dim: c + '77'}),
    },

    postprocess: v => v
      .slot('color', '#123456')
      .slot('href', 'https://hsmusic.wiki/media/cool file.pdf')
      .slot('hash', 'fooey')
      .slot('attributes', {class: 'dog', id: 'cat1'})
      .slot('content', 'My Cool Link'),
  });

  evaluate.snapshot('fill path slot & provide appendIndexHTML', {
    name: 'linkTemplate',

    extraDependencies: {
      to: (...path) => '/c*lzone/' + path.join('/') + '/',
      appendIndexHTML: true,
    },

    postprocess: v => v
      .slot('path', ['myCoolPath', 'ham', 'pineapple', 'tomato']),
  });
});
