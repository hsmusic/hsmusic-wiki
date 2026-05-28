import {input, templateCompositeFrom} from '#composite';
import {getKebabCase} from '#wiki-data';

import {withPropertiesFromObject} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withDirectorySuffixes`,

  inputs: {
    from: input({
      defaultDependency: '_suffixDirectory',
      acceptsNull: true,
    }),
  },

  // sorry these are in noun form (dies)
  outputs: ['#directorySuffix', '#directorySuffixWithinAlbum'],

  steps: () =>  [
    withPropertiesFromObject({
      object: 'trackSection',
      properties: input.value([
        'suffixTrackDirectoriesByDefault',
        'directorySuffixForTracks',
      ]),
    }),

    {
      dependencies: [
        input('from'),
        '#trackSection.suffixTrackDirectoriesByDefault',
        '#trackSection.directorySuffixForTracks',
      ],

      compute(continuation, {
        [input('from')]:
          suffixDirectory,

        ['#trackSection.suffixTrackDirectoriesByDefault']:
          suffixTrackDirectoriesByDefault,

        ['#trackSection.directorySuffixForTracks']:
          directorySuffixForTracks,
      }) {
        // All conditions in this chunk process explicitly set values for
        // the actual update value - that is, everything EXCEPT true or null,
        // which both pass through to conditional "defaults".
        // (True and null aren't quite equal, but the difference only matters
        //  at the very end.)

        if (suffixDirectory === 'album') {
          return continuation.raiseOutput({
            ['#directorySuffix']: directorySuffixForTracks,
            ['#directorySuffixWithinAlbum']: null,
          });
        }

        if (typeof suffixDirectory === 'string') {
          return continuation.raiseOutput({
            ['#directorySuffix']: suffixDirectory,
            ['#directorySuffixWithinAlbum']: suffixDirectory,
          });
        }

        if (suffixDirectory === false) {
          return continuation.raiseOutput({
            ['#directorySuffix']: null,
            ['#directorySuffixWithinAlbum']: null,
          });
        }

        if (Array.isArray(suffixDirectory)) {
          const parts1 =
            suffixDirectory
              .map(item =>
                (item === 'album'
                  ? directorySuffixForTracks
                  : item));

          const parts2 =
            suffixDirectory
              .map(item =>
                (item === 'album'
                  ? null
                  : item))
              .filter(Boolean);

          return continuation.raiseOutput({
            ['#directorySuffix']: parts1.join('-'),
            ['#directorySuffixWithinAlbum']: parts2.join('-'),
          });
        }

        // It's true or null - just continue.
        return continuation();
      },
    },

    {
      dependencies: [
        '#trackSection.suffixTrackDirectoriesByDefault',
        '#trackSection.directorySuffixForTracks',
      ],

      compute(continuation, {
        ['#trackSection.suffixTrackDirectoriesByDefault']:
          suffixTrackDirectoriesByDefault,

        ['#trackSection.directorySuffixForTracks']:
          directorySuffixForTracks,
      }) {
        if (suffixTrackDirectoriesByDefault === true) {
          return continuation.raiseOutput({
            ['#directorySuffix']: directorySuffixForTracks,
            ['#directorySuffixWithinAlbum']: null,
          });
        }

        return continuation();
      },
    },

    {
      dependencies: [
        '_nameDetail',
         'nameDetailAcrossWiki',

        '#trackSection.directorySuffixForTracks',
      ],

      compute(continuation, {
        ['_nameDetail']: nameDetail,
        [ 'nameDetailAcrossWiki']: nameDetailAcrossWiki,

        ['#trackSection.directorySuffixForTracks']:
          directorySuffixForTracks,
      }) {
        if (nameDetail === 'album') {
          return continuation.raiseOutput({
            ['#directorySuffix']: directorySuffixForTracks,
            ['#directorySuffixWithinAlbum']: directorySuffixForTracks,
          });
        }

        if (nameDetailAcrossWiki) {
          const kebab = getKebabCase(nameDetailAcrossWiki);

          return continuation.raiseOutput({
            ['#directorySuffix']: kebab,
            ['#directorySuffixWithinAlbum']: kebab,
          });
        }

        return continuation();
      },
    },

    // Ultimately, if no conditions above exposed a more particular value,
    // now we can FINALLY differentiate between true and null.
    {
      dependencies: [
        input('from'),
        '#trackSection.directorySuffixForTracks',
      ],

      compute: (continuation, {
        [input('from')]:
          suffixDirectory,

        ['#trackSection.directorySuffixForTracks']:
          directorySuffixForTracks,
      }) =>
        (suffixDirectory === true
          ? continuation({
              ['#directorySuffix']: directorySuffixForTracks,
              ['#directorySuffixWithinAlbum']: null,
            })
          : continuation({
              ['#directorySuffix']: null,
              ['#directorySuffixWithinAlbum']: null,
            })),
    },
  ],
});
