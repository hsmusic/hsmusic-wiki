// todo: this dependency was replaced with linkContribution, restructure test

import t from 'tap';
import {testContentFunctions} from '../../../lib/content-function.js';

t.skip('generateContributionLinks (unit)', async t => {
  const artist1 = {
    name: 'Clark Powell',
    urls: ['https://soundcloud.com/plazmataz'],
  };

  const artist2 = {
    name: 'Grounder & Scratch',
    urls: [],
  };

  const artist3 = {
    name: 'Toby Fox',
    urls: ['https://tobyfox.bandcamp.com/', 'https://toby.fox/'],
  };

  const contributions = [
    {who: artist1, what: null},
    {who: artist2, what: 'Snooping'},
    {who: artist3, what: 'Arrangement'},
  ];

  await testContentFunctions(t, 'generateContributionLinks (unit 1)', async (t, evaluate) => {
    const config = {
      showContribution: true,
      showIcons: true,
    };

    await evaluate.load({
      mock: evaluate.mock(mock => ({
        linkArtist: {
          relations: mock.function('linkArtist.relations', () => ({}))
            .args([undefined, artist1]).next()
            .args([undefined, artist2]).next()
            .args([undefined, artist3]),

          data: mock.function('linkArtist.data', () => ({}))
            .args([artist1]).next()
            .args([artist2]).next()
            .args([artist3]),

          // This can be tweaked to return a specific (mocked) template
          // for each artist if we need to test for slots in the future.
          generate: mock.function('linkArtist.generate', () => 'artist link')
            .repeat(3),
        },

        linkExternalAsIcon: {
          data: mock.function('linkExternalAsIcon.data', () => ({}))
            .args([artist1.urls[0]]).next()
            .args([artist3.urls[0]]).next()
            .args([artist3.urls[1]]),

          generate: mock.function('linkExternalAsIcon.generate', () => 'icon')
            .repeat(3),
        }
      })),
    });

    evaluate({
      name: 'generateContributionLinks',
      args: [contributions, config],
    });
  });

  await testContentFunctions(t, 'generateContributionLinks (unit 2)', async (t, evaluate) => {
    const config = {
      showContribution: false,
      showIcons: false,
    };

    await evaluate.load({
      mock: evaluate.mock(mock => ({
        linkArtist: {
          relations: mock.function('linkArtist.relations', () => ({}))
            .args([undefined, artist1]).next()
            .args([undefined, artist2]).next()
            .args([undefined, artist3]),

          data: mock.function('linkArtist.data', () => ({}))
            .args([artist1]).next()
            .args([artist2]).next()
            .args([artist3]),

          generate: mock.function(() => 'artist link')
            .repeat(3),
        },

        linkExternalAsIcon: {
          data: mock.function('linkExternalAsIcon.data', () => ({}))
            .neverCalled(),

          generate: mock.function('linkExternalAsIcon.generate', () => 'icon')
            .neverCalled(),
        },
      })),
    });

    evaluate({
      name: 'generateContributionLinks',
      args: [contributions, config],
    });
  });
});
