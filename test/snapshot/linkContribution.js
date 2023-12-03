import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'linkContribution (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  const quickSnapshot = (message, slots) =>
    evaluate.snapshot(message, {
      name: 'linkContribution',
      multiple: [
        {args: [
          {who: {
            name: 'Clark Powell',
            directory: 'clark-powell',
            urls: ['https://soundcloud.com/plazmataz'],
          }, what: null},
        ]},
        {args: [
          {who: {
            name: 'Grounder & Scratch',
            directory: 'the-big-baddies',
            urls: [],
          }, what: 'Snooping'},
        ]},
        {args: [
          {who: {
            name: 'Toby Fox',
            directory: 'toby-fox',
            urls: ['https://tobyfox.bandcamp.com/', 'https://toby.fox/'],
          }, what: 'Arrangement'},
        ]},
      ],
      slots,
    });

  quickSnapshot('showContribution & showIcons (inline)', {
    showContribution: true,
    showIcons: true,
    iconMode: 'inline',
  });

  quickSnapshot('showContribution & showIcons (tooltip)', {
    showContribution: true,
    showIcons: true,
    iconMode: 'tooltip',
  });

  quickSnapshot('only showContribution', {
    showContribution: true,
  });

  quickSnapshot('only showIcons (inline)', {
    showIcons: true,
    iconMode: 'inline',
  });

  quickSnapshot('only showIcons (tooltip)', {
    showContribution: true,
    showIcons: true,
    iconMode: 'tooltip',
  });

  quickSnapshot('no accents', {});

  evaluate.snapshot('loads of links (inline)', {
    name: 'linkContribution',
    args: [
      {who: {name: 'Lorem Ipsum Lover', directory: 'lorem-ipsum-lover', urls: [
        'https://loremipsum.io',
        'https://loremipsum.io/generator/',
        'https://loremipsum.io/#meaning',
        'https://loremipsum.io/#usage-and-examples',
        'https://loremipsum.io/#controversy',
        'https://loremipsum.io/#when-to-use-lorem-ipsum',
        'https://loremipsum.io/#lorem-ipsum-all-the-things',
        'https://loremipsum.io/#original-source',
      ]}, what: null},
    ],
    slots: {showIcons: true},
  });

  evaluate.snapshot('loads of links (tooltip)', {
    name: 'linkContribution',
    args: [
      {who: {name: 'Lorem Ipsum Lover', directory: 'lorem-ipsum-lover', urls: [
        'https://loremipsum.io',
        'https://loremipsum.io/generator/',
        'https://loremipsum.io/#meaning',
        'https://loremipsum.io/#usage-and-examples',
        'https://loremipsum.io/#controversy',
        'https://loremipsum.io/#when-to-use-lorem-ipsum',
        'https://loremipsum.io/#lorem-ipsum-all-the-things',
        'https://loremipsum.io/#original-source',
      ]}, what: null},
    ],
    slots: {showIcons: true, iconMode: 'tooltip'},
  });

  quickSnapshot('no preventWrapping', {
    showContribution: true,
    showIcons: true,
    preventWrapping: false,
  });
});
