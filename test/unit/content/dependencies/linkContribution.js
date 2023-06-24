import t from 'tap';
import {testContentFunctions} from '../../../lib/content-function.js';

t.test('generateContributionLinks (unit)', async t => {
  const who1 = {
    name: 'Clark Powell',
    directory: 'clark-powell',
    urls: ['https://soundcloud.com/plazmataz'],
  };

  const who2 = {
    name: 'Grounder & Scratch',
    directory: 'the-big-baddies',
    urls: [],
  };

  const who3 = {
    name: 'Toby Fox',
    directory: 'toby-fox',
    urls: ['https://tobyfox.bandcamp.com/', 'https://toby.fox/'],
  };

  const what1 = null;
  const what2 = 'Snooping';
  const what3 = 'Arrangement';

  await testContentFunctions(t, 'generateContributionLinks (unit 1)', async (t, evaluate) => {
    const slots = {
      showContribution: true,
      showIcons: true,
    };

    await evaluate.load({
      mock: evaluate.mock(mock => ({
        linkArtist: {
          relations: mock.function('linkArtist.relations', () => ({}))
            .args([undefined, who1]).next()
            .args([undefined, who2]).next()
            .args([undefined, who3]),

          data: mock.function('linkArtist.data', () => ({}))
            .args([who1]).next()
            .args([who2]).next()
            .args([who3]),

          // This can be tweaked to return a specific (mocked) template
          // for each artist if we need to test for slots in the future.
          generate: mock.function('linkArtist.generate', () => 'artist link')
            .repeat(3),
        },

        linkExternalAsIcon: {
          data: mock.function('linkExternalAsIcon.data', () => ({}))
            .args([who1.urls[0]]).next()
            .args([who3.urls[0]]).next()
            .args([who3.urls[1]]),

          generate: mock.function('linkExternalAsIcon.generate', () => 'icon')
            .repeat(3),
        }
      })),
    });

    evaluate({
      name: 'linkContribution',
      multiple: [
        {args: [{who: who1, what: what1}]},
        {args: [{who: who2, what: what2}]},
        {args: [{who: who3, what: what3}]},
      ],
      slots,
    });
  });

  await testContentFunctions(t, 'generateContributionLinks (unit 2)', async (t, evaluate) => {
    const slots = {
      showContribution: false,
      showIcons: false,
    };

    await evaluate.load({
      mock: evaluate.mock(mock => ({
        linkArtist: {
          relations: mock.function('linkArtist.relations', () => ({}))
            .args([undefined, who1]).next()
            .args([undefined, who2]).next()
            .args([undefined, who3]),

          data: mock.function('linkArtist.data', () => ({}))
            .args([who1]).next()
            .args([who2]).next()
            .args([who3]),

          generate: mock.function(() => 'artist link')
            .repeat(3),
        },

        // Even though icons are hidden, these are still called! The dependency
        // tree is the same since whether or not the external icon links are
        // shown is dependent on a slot, which is undefined and arbitrary at
        // relations/data time (it might change on a whim at generate time).
        linkExternalAsIcon: {
          data: mock.function('linkExternalAsIcon.data', () => ({}))
            .repeat(3),

          generate: mock.function('linkExternalAsIcon.generate', () => 'icon')
            .repeat(3),
        },
      })),
    });

    evaluate({
      name: 'linkContribution',
      multiple: [
        {args: [{who: who1, what: what1}]},
        {args: [{who: who2, what: what2}]},
        {args: [{who: who3, what: what3}]},
      ],
      slots,
    });
  });
});
