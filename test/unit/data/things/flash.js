import t from 'tap';

import thingConstructors from '#things';

import {
  linkAndBindWikiData,
  stubThing,
  stubWikiData,
} from '#test-lib';

t.test(`Flash.color`, t => {
  const {Flash, FlashAct} = thingConstructors;

  t.plan(4);

  const wikiData = stubWikiData();

  const flash = stubThing(wikiData, Flash, {directory: 'my-flash'});
  const flashAct = stubThing(wikiData, FlashAct, {flashes: ['flash:my-flash']});

  const {XXX_decacheWikiData} = linkAndBindWikiData(wikiData);

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
