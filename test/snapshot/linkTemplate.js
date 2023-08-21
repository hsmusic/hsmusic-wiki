import t from 'tap';
import * as html from '#html';
import {testContentFunctions} from '#test-lib';

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
      content: 'delish',
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
      content: `Damn, that's some good sheet music`,
    },
  });

  evaluate.snapshot('missing content', {
    name: 'linkTemplate',
    slots: {href: 'banana'},
  });

  evaluate.snapshot('link in content', {
    name: 'linkTemplate',
    slots: {
      hash: 'the-more-ye-know',
      content: [
        `Oh geez oh heck`,
        html.tag('a', {href: 'dogs'}, `There's a link in here!!`),
        `But here's <b>a normal tag.</b>`,
        html.tag('div', `Gotta keep them normal tags.`),
        html.tag('div', `But not... <a href="#">NESTED LINKS, OOO.</a>`),
      ],
    },
  });
});
