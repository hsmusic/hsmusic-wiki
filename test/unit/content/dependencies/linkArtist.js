import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'linkArtist (unit)', async (t, evaluate) => {
  const artistObject = {};
  const linkTemplate = {};

  await evaluate.load({
    mock: evaluate.mock(mock => ({
      linkThing: {
        relations: mock.function('linkThing.relations', () => ({}))
          .args([undefined, 'localized.artist', artistObject])
          .once(),

        data: mock.function('linkThing.data', () => ({}))
          .args(['localized.artist', artistObject])
          .once(),

        generate: mock.function('linkThing.data', () => linkTemplate)
          .once(),
      }
    })),
  });

  const result = evaluate({
    name: 'linkArtist',
    args: [artistObject],
  });

  t.equal(result, linkTemplate);
});
