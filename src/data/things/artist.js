export const ARTIST_DATA_FILE = 'artists.yaml';

import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {input} from '#composite';
import {sortAlphabetically} from '#sort';
import {stitchArrays} from '#sugar';
import Thing from '#thing';
import {isName, validateArrayItems} from '#validators';
import {getKebabCase} from '#wiki-data';

import {
  contentString,
  directory,
  fileExtension,
  flag,
  name,
  reverseReferenceList,
  singleReference,
  soupyFind,
  soupyReverse,
  urls,
  wikiData,
} from '#composite/wiki-properties';

import {artistTotalDuration} from '#composite/things/artist';

export class Artist extends Thing {
  static [Thing.referenceType] = 'artist';
  static [Thing.wikiDataArray] = 'artistData';

  static [Thing.getPropertyDescriptors] = ({Album, Flash, Group, Track}) => ({
    // Update & expose

    name: name('Unnamed Artist'),
    directory: directory(),
    urls: urls(),

    contextNotes: contentString(),

    hasAvatar: flag(false),
    avatarFileExtension: fileExtension('jpg'),

    aliasNames: {
      flags: {update: true, expose: true},
      update: {validate: validateArrayItems(isName)},
      expose: {transform: (names) => names ?? []},
    },

    isAlias: flag(),

    aliasedArtist: singleReference({
      class: input.value(Artist),
      find: soupyFind.input('artist'),
    }),

    alwaysReferenceByDirectory: flag(false),

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // Expose only

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

    aliasNames: S.id,

    tracksAsCommentator: S.toRefs,
    albumsAsCommentator: S.toRefs,
  });

  static [Thing.findSpecs] = {
    artist: {
      referenceTypes: ['artist', 'artist-gallery'],
      bindTo: 'artistData',

      include: artist => !artist.isAlias,

      getMatchableNames: artist =>
        (artist.alwaysReferenceByDirectory 
          ? [] 
          : [artist.name]),
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
        for (const aliasName of originalArtist.aliasNames) {
          // These are trouble. We should be accessing aliases' directories
          // directly, but artists currently don't expose a reverse reference
          // list for aliases. (This is pending a cleanup of "reverse reference"
          // behavior in general.) It doesn't actually cause problems *here*
          // because alias directories are computed from their names 100% of the
          // time, but that *is* an assumption this code makes.
          if (aliasName === artist.name) continue;
          if (artist.directory === getKebabCase(aliasName)) {
            return [];
          }
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

      'Has Avatar': {property: 'hasAvatar'},
      'Avatar File Extension': {property: 'avatarFileExtension'},

      'Aliases': {property: 'aliasNames'},

      'Dead URLs': {ignore: true},

      'Always Reference By Directory': {property: 'alwaysReferenceByDirectory'},

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

      const artistRefs =
        artists.map(artist => Thing.getReference(artist));

      const artistAliasNames =
        artists.map(artist => artist.aliasNames);

      const artistAliases =
        stitchArrays({
          originalArtistRef: artistRefs,
          aliasNames: artistAliasNames,
        }).flatMap(({originalArtistRef, aliasNames}) =>
            aliasNames.map(name => {
              const alias = new Artist();
              alias.name = name;
              alias.isAlias = true;
              alias.aliasedArtist = originalArtistRef;
              return alias;
            }));

      const artistData = [...artists, ...artistAliases];

      return {artistData};
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
      } catch (_error) {
        aliasedArtist = CacheableObject.getUpdateValue(this, 'aliasedArtist');
      }

      parts.push(` ${colors.yellow(`[of ${aliasedArtist}]`)}`);
    }

    return parts.join('');
  }
}
