import t from 'tap';
import * as html from '#html';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'generatePreviousNextLinks (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  const quickSnapshot = (message, slots) =>
    evaluate.snapshot(message, {
      name: 'generatePreviousNextLinks',
      slots,
      postprocess: template => template.content.join('\n'),
    });

  quickSnapshot('basic behavior', {
    previousLink: evaluate.stubTemplate('previous'),
    nextLink: evaluate.stubTemplate('next'),
  });

  quickSnapshot('previous missing', {
    nextLink: evaluate.stubTemplate('next'),
  });

  quickSnapshot('next missing', {
    previousLink: evaluate.stubTemplate('previous'),
  });

  quickSnapshot('neither link present', {});

  quickSnapshot('disable id', {
    previousLink: evaluate.stubTemplate('previous'),
    nextLink: evaluate.stubTemplate('next'),
    id: false,
  });
});
