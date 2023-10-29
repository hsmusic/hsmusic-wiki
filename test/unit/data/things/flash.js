import t from 'tap';

import {linkAndBindWikiData} from '#test-lib';
import thingConstructors from '#things';

const {
  Flash,
  FlashAct,
  Thing,
} = thingConstructors;

function stubFlash(directory = 'foo') {
  const flash = new Flash();
  flash.directory = directory;

  return flash;
}

function stubFlashAct(flashes, directory = 'bar') {
  const flashAct = new FlashAct();
  flashAct.directory = directory;
  flashAct.flashes = flashes.map(flash => Thing.getReference(flash));

  return flashAct;
}

t.test(`Flash.color`, t => {
  t.plan(4);

  const flash = stubFlash();
  const flashAct = stubFlashAct([flash]);

  const {XXX_decacheWikiData} = linkAndBindWikiData({
    flashData: [flash],
    flashActData: [flashAct],
  });

  t.equal(flash.color, null,
    `color #1: defaults to null`);

  flashAct.color = '#abcdef';
  XXX_decacheWikiData();

  t.equal(flash.color, '#abcdef',
    `color #2: inherits from flash act`);

  flash.color = '#123456';

  t.equal(flash.color, '#123456',
    `color #3: is own value`);

  t.throws(() => { flash.color = '#aeiouw'; },
    {cause: TypeError},
    `color #4: must be set to valid color`);
});
