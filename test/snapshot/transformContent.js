import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'transformContent (snapshot)', async (t, evaluate) => {
  await evaluate.load({
    mock: {
      image: evaluate.stubContentFunction('image'),
    },
  });

  const extraDependencies = {
    wikiData: {
      albumData: [
        {directory: 'cool-album', name: 'Cool Album', color: '#123456'},
      ],
    },

    to: (key, ...args) => `to-${key}/${args.join('/')}`,
  };

  const quickSnapshot = (message, content, slots) =>
    evaluate.snapshot(message, {
      name: 'transformContent',
      args: [content],
      extraDependencies,
      slots,
    });

  quickSnapshot(
    'two text paragraphs',
      `Hello, world!\n` +
      `Wow, this is very cool.`);

  quickSnapshot(
    'links to a thing',
      `This is [[album:cool-album|my favorite album]].\n` +
      `That's right, [[album:cool-album]]!`);

  quickSnapshot(
    'indent on a directly following line',
      `<div>\n` +
      `    <span>Wow!</span>\n` +
      `</div>`);

  quickSnapshot(
    'indent on an indierctly following line',
      `Some text.\n` +
      `Yes, some more text.\n` +
      `\n` +
      `    I am hax0rz!!\n` +
      `    All yor base r blong 2 us.\n` +
      `\n` +
      `Aye.\n` +
      `Aye aye aye.`);

  quickSnapshot(
    'hanging indent list',
      `Hello!\n` +
      `\n` +
      `* I am a list item and I\n` +
      `  go on and on and on\n` +
      `  and on and on and on.\n` +
      `\n` +
      `* I am another list item.\n` +
      `  Yeah.\n` +
      `\n` +
      `In-between!\n` +
      `\n` +
      `* Spooky,\n` +
      `  spooky, I say!\n` +
      `* Following list item.\n` +
      `  No empty line around me.\n` +
      `* Very cool.\n` +
      `  So, so cool.\n` +
      `\n` +
      `Goodbye!`);

  quickSnapshot(
    'inline images',
      `<img src="snooping.png"> as USUAL...\n` +
      `What do you know? <img src="cowabunga.png" width="24" height="32">\n` +
      `[[album:cool-album|I'm on the left.]]<img src="im-on-the-right.jpg">\n` +
      `<img src="im-on-the-left.jpg">[[album:cool-album|I'm on the right.]]\n` +
      `Media time! <img src="media/misc/interesting.png"> Oh yeah!\n` +
      `<img src="must.png"><img src="stick.png"><img src="together.png">\n` +
      `And... all done! <img src="end-of-source.png">`);

  quickSnapshot(
    'non-inline image #1',
      `<img src="spark.png">`);

  quickSnapshot(
    'non-inline image #2',
      `Rad.\n` +
      `<img src="spark.png">`);

  quickSnapshot(
    'non-inline image #3',
      `<img src="spark.png">\n` +
      `Baller.`);

  quickSnapshot(
    'dates',
      `[[date:2023-04-13]] Yep!\n` +
      `Very nice: [[date:25 October 2413]]`);

  quickSnapshot(
    'super basic string',
      `Neat listing: [[string:listingPage.listAlbums.byDate.title]]`);

  quickSnapshot(
    'basic markdown',
      `Hello *world!* This is **SO COOL.**`);

  quickSnapshot(
    'escape entire tag',
      `\\[[album:cool-album|spooky]] [[album:cool-album|scary]]`);

  quickSnapshot(
    'escape end of tag',
      `My favorite album is [[album:cool-album|[Tactical Omission\\]]].\n` +
      `Your favorite album is [[album:cool-album|[Tactical Wha-Huh-Now]]].`);

  quickSnapshot(
    'escape markdown',
      `What will it be, *ye fool?* \\*arr*`);

  quickSnapshot(
    'lyrics - basic line breaks',
      `Hey, ho\n` +
      `And away we go\n` +
      `Truly, music\n` +
      `\n` +
      `(Oh yeah)\n` +
      `(That's right)`,
      {mode: 'lyrics'});

  quickSnapshot(
    'lyrics - repeated and edge line breaks',
      `\n\nWell, you know\nHow it goes\n\n\nYessiree\n\n\n`,
      {mode: 'lyrics'});

  quickSnapshot(
    'lyrics - line breaks around tags',
      `The date be [[date:13 April 2004]]\n` +
      `I say, the date be [[date:13 April 2004]]\n` +
      `[[date:13 April 2004]]\n` +
      `[[date:13 April 2004]][[date:13 April 2004]][[date:13 April 2004]]\n` +
      `(Aye!)\n` +
      `\n` +
      `[[date:13 April 2004]]\n` +
      `[[date:13 April 2004]][[date:13 April 2004]]\n` +
      `[[date:13 April 2004]]\n` +
      `\n` +
      `[[date:13 April 2004]]\n` +
      `[[date:13 April 2004]], and don't ye forget it`,
      {mode: 'lyrics'});

  quickSnapshot(
    'emails',
      `Email cute dogs to qznebula@protonmail.com please.\n` +
      `Just kidding... [unless?](mailto:qznebula@protonmail.com)`);

  // TODO: Snapshots for mode: inline
  // TODO: Snapshots for mode: single-link
});
