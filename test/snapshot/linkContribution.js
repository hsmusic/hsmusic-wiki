import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'linkContribution (snapshot)', async (t, evaluate) => {
  const who1 = {
    name: 'Clark Powell',
    directory: 'clark-powell',
    urls: ['https://soundcloud.com/plazmataz'],
  };

  const who2 = {
    name: 'Grounder & Scratch',
    directory: 'the-big-baddies',
    urls: [],
  };

  const who3 = {
    name: 'Toby Fox',
    directory: 'toby-fox',
    urls: ['https://tobyfox.bandcamp.com/', 'https://toby.fox/'],
  };

  const what1 = null;
  const what2 = 'Snooping';
  const what3 = 'Arrangement';

  await evaluate.load();

  const quickSnapshot = (message, slots) =>
    evaluate.snapshot(message, {
      name: 'linkContribution',
      multiple: [
        {args: [who1, what1]},
        {args: [who2, what2]},
        {args: [who3, what3]},
      ],
      slots,
    });

  quickSnapshot('showContribution & showIcons', {
    showContribution: true,
    showIcons: true,
  });

  quickSnapshot('only showContribution', {
    showContribution: true,
  });

  quickSnapshot('only showIcons', {
    showIcons: true,
  });

  quickSnapshot('no accents', {});

  evaluate.snapshot('loads of links', {
    name: 'linkContribution',
    args: [
      {name: 'Lorem Ipsum Lover', directory: 'lorem-ipsum-lover', urls: [
        'https://loremipsum.io',
        'https://loremipsum.io/generator/',
        'https://loremipsum.io/#meaning',
        'https://loremipsum.io/#usage-and-examples',
        'https://loremipsum.io/#controversy',
        'https://loremipsum.io/#when-to-use-lorem-ipsum',
        'https://loremipsum.io/#lorem-ipsum-all-the-things',
        'https://loremipsum.io/#original-source',
      ]},
      null,
    ],
    slots: {showIcons: true},
  });
});
