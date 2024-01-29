export const ARTIST_DATA_FILE = 'artists.yaml';

import {input} from '#composite';
import find from '#find';
import {unique} from '#sugar';
import Thing from '#thing';
import {isName, validateArrayItems} from '#validators';
import {sortAlphabetically} from '#wiki-data';

import {withReverseContributionList} from '#composite/wiki-data';

import {
  contentString,
  directory,
  fileExtension,
  flag,
  name,
  reverseContributionList,
  reverseReferenceList,
  singleReference,
  urls,
  wikiData,
} from '#composite/wiki-properties';

export class Artist extends Thing {
  static [Thing.referenceType] = 'artist';

  static [Thing.getPropertyDescriptors] = ({Album, Flash, Track}) => ({
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
      find: input.value(find.artist),
      data: 'artistData',
    }),

    // Update only

    albumData: wikiData({
      class: input.value(Album),
    }),

    artistData: wikiData({
      class: input.value(Artist),
    }),

    flashData: wikiData({
      class: input.value(Flash),
    }),

    trackData: wikiData({
      class: input.value(Track),
    }),

    // Expose only

    tracksAsArtist: reverseContributionList({
      data: 'trackData',
      list: input.value('artistContribs'),
    }),

    tracksAsContributor: reverseContributionList({
      data: 'trackData',
      list: input.value('contributorContribs'),
    }),

    tracksAsCoverArtist: reverseContributionList({
      data: 'trackData',
      list: input.value('coverArtistContribs'),
    }),

    tracksAsAny: [
      withReverseContributionList({
        data: 'trackData',
        list: input.value('artistContribs'),
      }).outputs({
        '#reverseContributionList': '#tracksAsArtist',
      }),

      withReverseContributionList({
        data: 'trackData',
        list: input.value('contributorContribs'),
      }).outputs({
        '#reverseContributionList': '#tracksAsContributor',
      }),

      withReverseContributionList({
        data: 'trackData',
        list: input.value('coverArtistContribs'),
      }).outputs({
        '#reverseContributionList': '#tracksAsCoverArtist',
      }),

      {
        dependencies: [
          '#tracksAsArtist',
          '#tracksAsContributor',
          '#tracksAsCoverArtist',
        ],

        compute: ({
          ['#tracksAsArtist']: tracksAsArtist,
          ['#tracksAsContributor']: tracksAsContributor,
          ['#tracksAsCoverArtist']: tracksAsCoverArtist,
        }) =>
          unique([
            ...tracksAsArtist,
            ...tracksAsContributor,
            ...tracksAsCoverArtist,
          ]),
      },
    ],

    tracksAsCommentator: reverseReferenceList({
      data: 'trackData',
      list: input.value('commentatorArtists'),
    }),

    albumsAsAlbumArtist: reverseContributionList({
      data: 'albumData',
      list: input.value('artistContribs'),
    }),

    albumsAsCoverArtist: reverseContributionList({
      data: 'albumData',
      list: input.value('coverArtistContribs'),
    }),

    albumsAsWallpaperArtist: reverseContributionList({
      data: 'albumData',
      list: input.value('wallpaperArtistContribs'),
    }),

    albumsAsBannerArtist: reverseContributionList({
      data: 'albumData',
      list: input.value('bannerArtistContribs'),
    }),

    albumsAsAny: [
      withReverseContributionList({
        data: 'albumData',
        list: input.value('artistContribs'),
      }).outputs({
        '#reverseContributionList': '#albumsAsArtist',
      }),

      withReverseContributionList({
        data: 'albumData',
        list: input.value('coverArtistContribs'),
      }).outputs({
        '#reverseContributionList': '#albumsAsCoverArtist',
      }),

      withReverseContributionList({
        data: 'albumData',
        list: input.value('wallpaperArtistContribs'),
      }).outputs({
        '#reverseContributionList': '#albumsAsWallpaperArtist',
      }),

      withReverseContributionList({
        data: 'albumData',
        list: input.value('bannerArtistContribs'),
      }).outputs({
        '#reverseContributionList': '#albumsAsBannerArtist',
      }),

      {
        dependencies: [
          '#albumsAsArtist',
          '#albumsAsCoverArtist',
          '#albumsAsWallpaperArtist',
          '#albumsAsBannerArtist',
        ],

        compute: ({
          ['#albumsAsArtist']: albumsAsArtist,
          ['#albumsAsCoverArtist']: albumsAsCoverArtist,
          ['#albumsAsWallpaperArtist']: albumsAsWallpaperArtist,
          ['#albumsAsBannerArtist']: albumsAsBannerArtist,
        }) =>
          unique([
            ...albumsAsArtist,
            ...albumsAsCoverArtist,
            ...albumsAsWallpaperArtist,
            ...albumsAsBannerArtist,
          ]),
      },
    ],

    albumsAsCommentator: reverseReferenceList({
      data: 'albumData',
      list: input.value('commentatorArtists'),
    }),

    flashesAsContributor: reverseContributionList({
      data: 'flashData',
      list: input.value('contributorContribs'),
    }),
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

    tracksAsArtist: S.toRefs,
    tracksAsContributor: S.toRefs,
    tracksAsCoverArtist: S.toRefs,
    tracksAsCommentator: S.toRefs,

    albumsAsAlbumArtist: S.toRefs,
    albumsAsCoverArtist: S.toRefs,
    albumsAsWallpaperArtist: S.toRefs,
    albumsAsBannerArtist: S.toRefs,
    albumsAsCommentator: S.toRefs,

    flashesAsContributor: S.toRefs,
  });

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
      const artistData = results;

      const artistAliasData = results.flatMap((artist) => {
        const origRef = Thing.getReference(artist);
        return artist.aliasNames?.map((name) => {
          const alias = new Artist();
          alias.name = name;
          alias.isAlias = true;
          alias.aliasedArtist = origRef;
          alias.artistData = artistData;
          return alias;
        }) ?? [];
      });

      return {artistData, artistAliasData};
    },

    sort({artistData, artistAliasData}) {
      sortAlphabetically(artistData);
      sortAlphabetically(artistAliasData);
    },
  });
}
