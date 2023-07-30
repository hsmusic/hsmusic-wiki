import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'transformContent (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  const extraDependencies = {
    wikiData: {
      albumData: [
        {directory: 'cool-album', name: 'Cool Album', color: '#123456'},
      ],
    },

    getSizeOfImageFile: () => 0,

    to: (key, ...args) => `to-${key}/${args.join('/')}`,
  };

  const quickSnapshot = (message, content, slots) =>
    evaluate.snapshot(message, {
      name: 'transformContent',
      args: [content],
      extraDependencies,
      slots,
    });

  // TODO: Snapshots for different transformContent modes

  quickSnapshot(
    'two text paragraphs',
      `Hello, world!\n` +
      `Wow, this is very cool.`);

  quickSnapshot(
    'links to a thing',
      `This is [[album:cool-album|my favorite album]].\n` +
      `That's right, [[album:cool-album]]!`);

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
      `Rad.\n<img src="spark.png">`);

  quickSnapshot(
    'non-inline image #3',
      `<img src="spark.png">\nBaller.`);
});
