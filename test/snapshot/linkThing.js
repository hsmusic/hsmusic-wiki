import t from 'tap';
import * as html from '#html';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'linkThing (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  const quickSnapshot = (message, oneOrMultiple) =>
    evaluate.snapshot(message,
      (Array.isArray(oneOrMultiple)
        ? {name: 'linkThing', multiple: oneOrMultiple}
        : {name: 'linkThing', ...oneOrMultiple}));

  quickSnapshot('basic behavior', {
    args: ['localized.track', {
      directory: 'foo',
      color: '#abcdef',
      name: `Cool track!`,
    }],
  });

  quickSnapshot('preferShortName', {
    args: ['localized.tag', {
      directory: 'five-oceanfalls',
      name: 'Five (Oceanfalls)',
      nameShort: 'Five',
    }],
    slots: {preferShortName: true},
  });

  quickSnapshot('tooltip & content', {
    args: ['localized.album', {
      directory: 'beyond-canon',
      name: 'Beyond Canon',
    }],
    multiple: [
      {slots: {tooltip: false}},
      {slots: {tooltip: true}},
      {slots: {tooltip: true, content: 'Next'}},
      {slots: {tooltip: 'Apple', content: 'Banana'}},
      {slots: {content: 'Banana'}},
    ],
  });

  quickSnapshot('color', {
    args: ['localized.track', {
      directory: 'showtime-piano-refrain',
      name: 'Showtime (Piano Refrain)',
      color: '#38f43d',
    }],
    multiple: [
      {slots: {color: false}},
      {slots: {color: true}},
      {slots: {color: '#aaccff'}},
    ],
  });

  quickSnapshot('tags in name escaped', [
    {args: ['localized.track', {
      directory: 'foo',
      name: `<a href="SNOOPING">AS USUAL</a> I SEE`,
    }]},
    {args: ['localized.track', {
      directory: 'bar',
      name: `<b>boldface</b>`,
    }]},
    {args: ['localized.album', {
      directory: 'exile',
      name: '>Exile<',
    }]},
    {args: ['localized.track', {
      directory: 'heart',
      name: '<3',
    }]},
  ]);

  quickSnapshot('nested links in content stripped', {
    args: ['localized.staticPage', {directory: 'foo', name: 'Foo'}],
    slots: {
      content:
        html.tag('b', {[html.joinChildren]: ''}, [
          html.tag('a', {href: 'bar'}, `Oooo!`),
          ` Very spooky.`,
        ]),
    },
  });
});
