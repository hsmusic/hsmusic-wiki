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
        'nameDetailForTracks',
      ]),
    }),

    withPropertiesFromObject({
      object: 'album',
      properties: input.value([
        'suffixTrackDirectoriesByDefault',
        'directorySuffixForTracks',
        'nameDetailForTracks',
      ]),
    }),

    {
      dependencies: [
        input('from'),
        '#album.directorySuffixForTracks',
        '#trackSection.directorySuffixForTracks',
      ],

      compute(continuation, {
        [input('from')]:
          suffixDirectory,

        ['#album.directorySuffixForTracks']:
          albumDirectorySuffixForTracks,

        ['#trackSection.directorySuffixForTracks']:
          trackSectionDirectorySuffixForTracks,
      }) {
        // All conditions in this chunk process explicitly set values for
        // the actual update value - that is, everything EXCEPT null,
        // which passes through to conditional "defaults".

        // Note that 'Suffix Directory: true' is literally equivalent to
        // suffixDirectory = 'album', via yaml transformation.
        if (suffixDirectory === 'album') {
          return continuation.raiseOutput({
            ['#directorySuffix']: albumDirectorySuffixForTracks,
            ['#directorySuffixWithinAlbum']: null,
          });
        }

        if (suffixDirectory === 'section') {
          // Bear in mind the directory is suffixed within the album.
          // This is repeated in following steps, too.
          return continuation.raiseOutput({
            ['#directorySuffix']: trackSectionDirectorySuffixForTracks,
            ['#directorySuffixWithinAlbum']: trackSectionDirectorySuffixForTracks,
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
                  ? albumDirectorySuffixForTracks
               : item === 'section'
                  ? trackSectionDirectorySuffixForTracks
                  : item));

          const parts2 =
            suffixDirectory
              .map(item =>
                (item === 'album'
                  ? null
               : item === 'section'
                  ? trackSectionDirectorySuffixForTracks
                  : item))
              .filter(Boolean);

          return continuation.raiseOutput({
            ['#directorySuffix']: parts1.join('-'),
            ['#directorySuffixWithinAlbum']: parts2.join('-'),
          });
        }

        // It's null - just continue.
        return continuation();
      },
    },

    {
      // Neither of the track section fields inherit from the album.
      // Importantly, trackSection.suffixTrackDirectoriesByDefault can be null
      // OR false at the same time as album.suffixTrackDirectoriesByDefault
      // is true, and those carry different meanings.
      dependencies: [
        '#trackSection.suffixTrackDirectoriesByDefault',
        '#trackSection.directorySuffixForTracks',
        '#album.suffixTrackDirectoriesByDefault',
        '#album.directorySuffixForTracks',
      ],

      compute(continuation, {
        ['#trackSection.suffixTrackDirectoriesByDefault']:
          trackSectionSuffixTrackDirectoriesByDefault,

        ['#trackSection.directorySuffixForTracks']:
          trackSectionDirectorySuffixForTracks,

        ['#album.suffixTrackDirectoriesByDefault']:
          albumSuffixTrackDirectoriesByDefault,

        ['#album.directorySuffixForTracks']:
          albumDirectorySuffixForTracks,
      }) {
        if (trackSectionSuffixTrackDirectoriesByDefault === true) {
          return continuation.raiseOutput({
            ['#directorySuffix']: trackSectionDirectorySuffixForTracks,
            ['#directorySuffixWithinAlbum']: trackSectionDirectorySuffixForTracks,
          });
        }

        if (trackSectionSuffixTrackDirectoriesByDefault === false) {
          // Just proceed. Other logic may independently provide a suffix,
          // but this false ensures that track ignores whether the *album*
          // provides Suffix Track Directories: true.
          return continuation();
        }

        if (albumSuffixTrackDirectoriesByDefault === true) {
          return continuation.raiseOutput({
            ['#directorySuffix']: albumDirectorySuffixForTracks,
            ['#directorySuffixWithinAlbum']: null,
          });
        }

        return continuation();
      },
    },

    {
      dependencies: [input('from'), '_directory'],
      compute(continuation, {
        [input('from')]: suffixDirectory,
        ['_directory']: directory,
      }) {
        // If Suffix Directory is not set and Directory IS set, then
        // no following logic should automatically provide a directory suffix
        // (which otherwise would be tacked onto the data-given Directory).
        if (suffixDirectory === null && directory !== null) {
          return continuation.raiseOutput({
            ['#directorySuffix']: null,
            ['#directorySuffixWithinAlbum']: null,
          });
        }

        return continuation();
      },
    },

    {
      // The logic path in this section is ONLY decided based on the track's
      // actually-set Name Detail, and inheritence is not a factor at all.
      dependencies: [
        '_nameDetail',
        '#album.nameDetailForTracks',
        '#album.directorySuffixForTracks',
        '#trackSection.nameDetailForTracks',
        '#trackSection.directorySuffixForTracks',
      ],

      compute(continuation, {
        ['_nameDetail']: nameDetail,

        ['#album.nameDetailForTracks']:
          albumNameDetailForTracks,

        ['#album.directorySuffixForTracks']:
          albumDirectorySuffixForTracks,

        ['#trackSection.nameDetailForTracks']:
          trackSectionNameDetailForTracks,

        ['#trackSection.directorySuffixForTracks']:
          trackSectionDirectorySuffixForTracks,
      }) {
        if (nameDetail === 'section') {
          return continuation.raiseOutput({
            ['#directorySuffix']: trackSectionDirectorySuffixForTracks,
            ['#directorySuffixWithinAlbum']: trackSectionDirectorySuffixForTracks,
          })
        }

        if (nameDetail === 'album') {
          return continuation.raiseOutput({
            ['#directorySuffix']: albumDirectorySuffixForTracks,
            ['#directorySuffixWithinAlbum']: null,
          });
        }

        if (nameDetail) {
          const kebab = getKebabCase(nameDetail);

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
