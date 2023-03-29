import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'linkExternalFlash (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot({
    name: 'linkExternalFlash',
    args: ['https://homestuck.com/story/4109/', {page: '4109'}],
  });

  evaluate.snapshot({
    name: 'linkExternalFlash',
    args: ['https://homestuck.com/story/pony/', {page: 'pony'}],
  });

  evaluate.snapshot({
    name: 'linkExternalFlash',
    args: ['https://youtu.be/FDt-SLyEcjI', {page: '4109'}],
  });

  evaluate.snapshot({
    name: 'linkExternalFlash',
    args: ['https://www.bgreco.net/hsflash/006009.html', {page: '4109'}],
  });

  evaluate.snapshot({
    name: 'linkExternalFlash',
    args: ['https://www.newgrounds.com/portal/view/582345', {page: '4109'}],
  })
});
