export const ARTIST_DATA_FILE = 'artists.yaml';

import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {input} from '#composite';
import {stitchArrays} from '#sugar';
import Thing from '#thing';
import {validateArrayItems} from '#validators';
import {getKebabCase} from '#wiki-data';
import {parseArtistAliases, parseArtwork} from '#yaml';

import {
  sortAlbumsTracksChronologically,
  sortArtworksChronologically,
  sortAlphabetically,
  sortContributionsChronologically,
} from '#sort';

import {exitWithoutDependency, exposeConstant} from '#composite/control-flow';
import {withReverseReferenceList} from '#composite/wiki-data';

import {
  constitutibleArtwork,
  contentString,
  directory,
  fileExtension,
  flag,
  name,
  reverseReferenceList,
  singleReference,
  soupyFind,
  soupyReverse,
  thing,
  thingList,
  urls,
} from '#composite/wiki-properties';

import {artistTotalDuration} from '#composite/things/artist';

export class Artist extends Thing {
  static [Thing.referenceType] = 'artist';
  static [Thing.wikiDataArray] = 'artistData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    name: name('Unnamed Artist'),
    directory: directory(),
    urls: urls(),

    contextNotes: contentString(),

    hasAvatar: flag(false),
    avatarFileExtension: fileExtension('jpg'),

    avatarArtwork: [
      exitWithoutDependency({
        dependency: 'hasAvatar',
        value: input.value(null),
      }),

      constitutibleArtwork.fromYAMLFieldSpec
        .call(this, 'Avatar Artwork'),
    ],

    isAlias: flag(),

    artistAliases: thingList({
      class: input.value(Artist),
    }),

    aliasedArtist: thing({
      class: input.value(Artist),
    }),

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // Expose only

    isArtist: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

    trackArtistContributions: reverseReferenceList({
      reverse: soupyReverse.input('trackArtistContributionsBy'),
    }),

    trackContributorContributions: reverseReferenceList({
      reverse: soupyReverse.input('trackContributorContributionsBy'),
    }),

    trackCoverArtistContributions: reverseReferenceList({
      reverse: soupyReverse.input('trackCoverArtistContributionsBy'),
    }),

    tracksAsCommentator: reverseReferenceList({
      reverse: soupyReverse.input('tracksWithCommentaryBy'),
    }),

    albumArtistContributions: reverseReferenceList({
      reverse: soupyReverse.input('albumArtistContributionsBy'),
    }),

    albumTrackArtistContributions: reverseReferenceList({
      reverse: soupyReverse.input('albumTrackArtistContributionsBy'),
    }),

    albumCoverArtistContributions: reverseReferenceList({
      reverse: soupyReverse.input('albumCoverArtistContributionsBy'),
    }),

    albumWallpaperArtistContributions: reverseReferenceList({
      reverse: soupyReverse.input('albumWallpaperArtistContributionsBy'),
    }),

    albumBannerArtistContributions: reverseReferenceList({
      reverse: soupyReverse.input('albumBannerArtistContributionsBy'),
    }),

    albumsAsCommentator: reverseReferenceList({
      reverse: soupyReverse.input('albumsWithCommentaryBy'),
    }),

    flashContributorContributions: reverseReferenceList({
      reverse: soupyReverse.input('flashContributorContributionsBy'),
    }),

    flashesAsCommentator: reverseReferenceList({
      reverse: soupyReverse.input('flashesWithCommentaryBy'),
    }),

    closelyLinkedGroups: reverseReferenceList({
      reverse: soupyReverse.input('groupsCloselyLinkedTo'),
    }),

    musicContributions: [
      withReverseReferenceList({
        reverse: soupyReverse.input('trackArtistContributionsBy'),
      }).outputs({
        '#reverseReferenceList': '#trackArtistContribs',
      }),

      withReverseReferenceList({
        reverse: soupyReverse.input('trackContributorContributionsBy'),
      }).outputs({
        '#reverseReferenceList': '#trackContributorContribs',
      }),

      {
        dependencies: [
          '#trackArtistContribs',
          '#trackContributorContribs',
        ],

        compute: (continuation, {
          ['#trackArtistContribs']: trackArtistContribs,
          ['#trackContributorContribs']: trackContributorContribs,
        }) => continuation({
          ['#contributions']: [
            ...trackArtistContribs,
            ...trackContributorContribs,
          ],
        }),
      },

      {
        dependencies: ['#contributions'],
        compute: ({'#contributions': contributions}) =>
          sortContributionsChronologically(
            contributions,
            sortAlbumsTracksChronologically),
      },
    ],

    artworkContributions: [
      withReverseReferenceList({
        reverse: soupyReverse.input('trackCoverArtistContributionsBy'),
      }).outputs({
        '#reverseReferenceList': '#trackCoverArtistContribs',
      }),

      withReverseReferenceList({
        reverse: soupyReverse.input('albumCoverArtistContributionsBy'),
      }).outputs({
        '#reverseReferenceList': '#albumCoverArtistContribs',
      }),

      withReverseReferenceList({
        reverse: soupyReverse.input('albumWallpaperArtistContributionsBy'),
      }).outputs({
        '#reverseReferenceList': '#albumWallpaperArtistContribs',
      }),

      withReverseReferenceList({
        reverse: soupyReverse.input('albumBannerArtistContributionsBy'),
      }).outputs({
        '#reverseReferenceList': '#albumBannerArtistContribs',
      }),

      {
        dependencies: [
          '#trackCoverArtistContribs',
          '#albumCoverArtistContribs',
          '#albumWallpaperArtistContribs',
          '#albumBannerArtistContribs',
        ],

        compute: (continuation, {
          ['#trackCoverArtistContribs']: trackCoverArtistContribs,
          ['#albumCoverArtistContribs']: albumCoverArtistContribs,
          ['#albumWallpaperArtistContribs']: albumWallpaperArtistContribs,
          ['#albumBannerArtistContribs']: albumBannerArtistContribs,
        }) => continuation({
          ['#contributions']: [
            ...trackCoverArtistContribs,
            ...albumCoverArtistContribs,
            ...albumWallpaperArtistContribs,
            ...albumBannerArtistContribs,
          ],
        }),
      },

      {
        dependencies: ['#contributions'],
        compute: ({'#contributions': contributions}) =>
          sortContributionsChronologically(
            contributions,
            sortArtworksChronologically),
      },
    ],

    totalDuration: artistTotalDuration(),
  });

  static [Thing.getSerializeDescriptors] = ({
    serialize: S,
  }) => ({
    name: S.id,
    directory: S.id,
    urls: S.id,
    contextNotes: S.id,

    hasAvatar: S.id,
    avatarFileExtension: S.id,

    tracksAsCommentator: S.toRefs,
    albumsAsCommentator: S.toRefs,
  });

  static [Thing.findSpecs] = {
    artist: {
      referenceTypes: ['artist', 'artist-gallery'],
      bindTo: 'artistData',

      include: artist => !artist.isAlias,
    },

    artistAlias: {
      referenceTypes: ['artist', 'artist-gallery'],
      bindTo: 'artistData',

      include: artist => artist.isAlias,

      getMatchableDirectories(artist) {
        const originalArtist = artist.aliasedArtist;

        // Aliases never match by the same directory as the original.
        if (artist.directory === originalArtist.directory) {
          return [];
        }

        // Aliases never match by the same directory as some *previous* alias
        // in the original's alias list. This is honestly a bit awkward, but it
        // avoids artist aliases conflicting with each other when checking for
        // duplicate directories.
        for (const alias of originalArtist.artistAliases) {
          if (alias === artist) break;
          if (alias.directory === artist.directory) return [];
        }

        // And, aliases never return just a blank string. This part is pretty
        // spooky because it doesn't handle two differently named aliases, on
        // different artists, who have names that are similar *apart* from a
        // character that's shortened. But that's also so fundamentally scary
        // that we can't support it properly with existing code, anyway - we
        // would need to be able to specifically set a directory *on an alias,*
        // which currently can't be done in YAML data files.
        if (artist.directory === '') {
          return [];
        }

        return [artist.directory];
      },
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Artist': {property: 'name'},
      'Directory': {property: 'directory'},
      'URLs': {property: 'urls'},
      'Context Notes': {property: 'contextNotes'},

      // note: doesn't really work as an independent field yet
      'Avatar Artwork': {
        property: 'avatarArtwork',
        transform:
          parseArtwork({
            single: true,
            thingProperty: 'avatarArtwork',
            fileExtensionFromThingProperty: 'avatarFileExtension',
          }),
      },

      'Has Avatar': {property: 'hasAvatar'},
      'Avatar File Extension': {property: 'avatarFileExtension'},

      'Aliases': {
        property: 'artistAliases',
        transform: parseArtistAliases,
      },

      'Dead URLs': {ignore: true},

      'Review Points': {ignore: true},
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {allInOne},
    thingConstructors: {Artist},
  }) => ({
    title: `Process artists file`,
    file: ARTIST_DATA_FILE,

    documentMode: allInOne,
    documentThing: Artist,

    save(results) {
      const artists = results;
      const artistAliases = artists.flatMap(artist => artist.artistAliases);
      const artistData = [...artists, ...artistAliases];

      const artworkData =
        artistData
          .filter(artist => artist.hasAvatar)
          .map(artist => artist.avatarArtwork);

      return {artistData, artworkData};
    },

    sort({artistData}) {
      sortAlphabetically(artistData);
    },
  });

  [inspect.custom]() {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (CacheableObject.getUpdateValue(this, 'isAlias')) {
      parts.unshift(`${colors.yellow('[alias]')} `);

      let aliasedArtist;
      try {
        aliasedArtist = this.aliasedArtist.name;
      } catch {
        aliasedArtist = CacheableObject.getUpdateValue(this, 'aliasedArtist');
      }

      parts.push(` ${colors.yellow(`[of ${aliasedArtist}]`)}`);
    }

    return parts.join('');
  }

  getOwnArtworkPath(artwork) {
    return [
      'media.artistAvatar',
      this.directory,
      artwork.fileExtension,
    ];
  }
}
