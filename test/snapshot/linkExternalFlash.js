import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'linkExternalFlash (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('basic behavior', {
    name: 'linkExternalFlash',
    multiple: [
      {args: ['https://homestuck.com/story/4109/', {page: '4109'}]},
      {args: ['https://youtu.be/FDt-SLyEcjI', {page: '4109'}]},
      {args: ['https://www.bgreco.net/hsflash/006009.html', {page: '4109'}]},
      {args: ['https://www.newgrounds.com/portal/view/582345', {page: '4109'}]},
    ],
  });

  evaluate.snapshot('secret page', {
    name: 'linkExternalFlash',
    multiple: [
      {args: ['https://homestuck.com/story/pony/', {page: 'pony'}]},
      {args: ['https://youtu.be/USB1pj6hAjU', {page: 'pony'}]},
    ],
  });
});
