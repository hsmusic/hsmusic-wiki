import t from 'tap';
import {testContentFunctions} from '#test-lib';

t.test('generateContributionLinks (unit)', async t => {
  const artist1 = {
    name: 'Clark Powell',
    directory: 'clark-powell',
    urls: ['https://soundcloud.com/plazmataz'],
  };

  const artist2 = {
    name: 'Grounder & Scratch',
    directory: 'the-big-baddies',
    urls: [],
  };

  const artist3 = {
    name: 'Toby Fox',
    directory: 'toby-fox',
    urls: ['https://tobyfox.bandcamp.com/', 'https://toby.fox/'],
  };

  const annotation1 = null;
  const annotation2 = 'Snooping';
  const annotation3 = 'Arrangement';

  await testContentFunctions(t, 'generateContributionLinks (unit 1)', async (t, evaluate) => {
    const slots = {
      showContribution: true,
      showExternalLinks: true,
    };

    await evaluate.load({
      mock: evaluate.mock(mock => ({
        linkArtist: {
          relations: mock
            .function('linkArtist.relations', () => ({}))
            .args([undefined, artist1]).next()
            .args([undefined, artist2]).next()
            .args([undefined, artist3]),

          data: mock
            .function('linkArtist.data', () => ({}))
            .args([artist1]).next()
            .args([artist2]).next()
            .args([artist3]),

          // This can be tweaked to return a specific (mocked) template
          // for each artist if we need to test for slots in the future.
          generate: mock.function('linkArtist.generate', () => 'artist link')
            .repeat(3),
        },

        generateExternalIcon: {
          data: mock
            .function('generateExternalIcon.data', () => ({}))
            .args([artist1.urls[0]]).next()
            .args([artist3.urls[0]]).next()
            .args([artist3.urls[1]]),

          generate: mock
            .function('generateExternalIcon.generate', () => ({
              toString: () => 'icon',
              setSlot: () => {},
            }))
            .repeat(3),
        }
      })),
    });

    evaluate({
      name: 'linkContribution',
      multiple: [
        {args: [{artist: artist1, annotation: annotation1}]},
        {args: [{artist: artist2, annotation: annotation2}]},
        {args: [{artist: artist3, annotation: annotation3}]},
      ],
      slots,
    });
  });

  await testContentFunctions(t, 'generateContributionLinks (unit 2)', async (t, evaluate) => {
    const slots = {
      showContribution: false,
      showExternalLinks: false,
    };

    await evaluate.load({
      mock: evaluate.mock(mock => ({
        linkArtist: {
          relations: mock
            .function('linkArtist.relations', () => ({}))
            .args([undefined, artist1]).next()
            .args([undefined, artist2]).next()
            .args([undefined, artist3]),

          data: mock
            .function('linkArtist.data', () => ({}))
            .args([artist1]).next()
            .args([artist2]).next()
            .args([artist3]),

          generate: mock
            .function(() => 'artist link')
            .repeat(3),
        },

        // Even though icons are hidden, these are still called! The dependency
        // tree is the same since whether or not the external icon links are
        // shown is dependent on a slot, which is undefined and arbitrary at
        // relations/data time (it might change on a whim at generate time).
        generateExternalIcon: {
          data: mock
            .function('generateExternalIcon.data', () => ({}))
            .repeat(3),

          generate: mock
            .function('generateExternalIcon.generate', () => ({
              toString: () => 'icon',
              setSlot: () => {},
            }))
            .repeat(3),
        },
      })),
    });

    evaluate({
      name: 'linkContribution',
      multiple: [
        {args: [{artist: artist1, annotation: annotation1}]},
        {args: [{artist: artist2, annotation: annotation2}]},
        {args: [{artist: artist3, annotation: annotation3}]},
      ],
      slots,
    });
  });
});
