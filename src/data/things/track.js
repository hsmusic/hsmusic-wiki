import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {input} from '#composite';
import {onlyItem} from '#sugar';
import {sortByDate} from '#sort';
import Thing from '#thing';
import {getKebabCase} from '#wiki-data';

import {
  isBoolean,
  isColor,
  isContentString,
  isContributionList,
  isDate,
  isFileExtension,
  validateReference,
} from '#validators';

import {
  parseAdditionalFiles,
  parseAdditionalNames,
  parseAnnotatedReferences,
  parseArtwork,
  parseCommentary,
  parseContributors,
  parseCreditingSources,
  parseReferencingSources,
  parseDate,
  parseDimensions,
  parseDuration,
  parseLyrics,
} from '#yaml';

import {
  exitWithoutDependency,
  exitWithoutUpdateValue,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
  exposeWhetherDependencyAvailable,
  withAvailabilityFilter,
  withResultOfAvailabilityCheck,
} from '#composite/control-flow';

import {
  fillMissingListItems,
  withFilteredList,
  withFlattenedList,
  withMappedList,
  withPropertyFromList,
  withPropertyFromObject,
} from '#composite/data';

import {
  withRecontextualizedContributionList,
  withRedatedContributionList,
  withResolvedContribs,
  withResolvedReference,
} from '#composite/wiki-data';

import {
  commentatorArtists,
  constitutibleArtworkList,
  contentString,
  contributionList,
  dimensions,
  directory,
  duration,
  flag,
  name,
  referenceList,
  referencedArtworkList,
  reverseReferenceList,
  simpleDate,
  simpleString,
  soupyFind,
  soupyReverse,
  thing,
  thingList,
  urls,
  wikiData,
} from '#composite/wiki-properties';

import {
  alwaysReferenceByDirectory,
  exitWithoutUniqueCoverArt,
  inheritContributionListFromMainRelease,
  inheritFromMainRelease,
  withPropertyFromAlbum,
  withTrackNumber,
} from '#composite/things/track';

export class Track extends Thing {
  static [Thing.referenceType] = 'track';
  static [Thing.wikiData] = 'trackData';

  static [Thing.constitutibleProperties] = [
    // Contributions currently aren't being observed for constitution.
    // 'artistContribs', // from main release or album
    // 'contributorContribs', // from main release
    // 'coverArtistContribs', // from main release

    'trackArtworks', // from inline fields
  ];

  static [Thing.getPropertyDescriptors] = ({
    AdditionalFile,
    AdditionalName,
    Album,
    ArtTag,
    Artwork,
    CommentaryEntry,
    CreditingSourcesEntry,
    LyricsEntry,
    ReferencingSourcesEntry,
    TrackSection,
    WikiInfo,
  }) => ({
    // > Update & expose - Internal relationships

    album: thing({
      class: input.value(Album),
    }),

    trackSection: thing({
      class: input.value(TrackSection),
    }),

    // > Update & expose - Identifying metadata

    name: name('Unnamed Track'),
    nameText: contentString(),

    directory: directory({
      suffix: 'directorySuffix',
    }),

    suffixDirectoryFromAlbum: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromObject({
        object: 'trackSection',
        property: input.value('suffixTrackDirectories'),
      }),

      exposeDependency({
        dependency: '#trackSection.suffixTrackDirectories',
      }),
    ],

    alwaysReferenceByDirectory: alwaysReferenceByDirectory(),

    // Album or track. The exposed value is really just what's provided here,
    // whether or not a matching track is found on a provided album, for
    // example. When presenting or processing, read `mainReleaseTrack`.
    mainRelease: [
      exitWithoutUpdateValue({
        validate: input.value(
          validateReference(['album', 'track'])),
      }),

      {
        dependencies: ['name'],
        transform: (ref, continuation, {name: ownName}) =>
          (ref === 'same name single'
            ? continuation(ref, {
                ['#albumOrTrackReference']: null,
                ['#sameNameSingleReference']: ownName,
              })
            : continuation(ref, {
                ['#albumOrTrackReference']: ref,
                ['#sameNameSingleReference']: null,
              })),
      },

      withResolvedReference({
        ref: '#albumOrTrackReference',
        find: soupyFind.input('trackMainReleasesOnly'),
      }).outputs({
        '#resolvedReference': '#matchingTrack',
      }),

      withResolvedReference({
        ref: '#albumOrTrackReference',
        find: soupyFind.input('album'),
      }).outputs({
        '#resolvedReference': '#matchingAlbum',
      }),

      withResolvedReference({
        ref: '#sameNameSingleReference',
        find: soupyFind.input('albumSinglesOnly'),
        findOptions: input.value({
          fuzz: {
            capitalization: true,
            kebab: true,
          },
        }),
      }).outputs({
        '#resolvedReference': '#sameNameSingle',
      }),

      exposeDependencyOrContinue({
        dependency: '#sameNameSingle',
      }),

      {
        dependencies: [
          '#matchingTrack',
          '#matchingAlbum',
        ],

        compute: (continuation, {
          ['#matchingTrack']: matchingTrack,
          ['#matchingAlbum']: matchingAlbum,
        }) =>
          (matchingTrack && matchingAlbum
            ? continuation()
         : matchingTrack ?? matchingAlbum
            ? matchingTrack ?? matchingAlbum
            : null),
      },

      withPropertyFromObject({
        object: '#matchingAlbum',
        property: input.value('tracks'),
      }),

      {
        dependencies: [
          '#matchingAlbum.tracks',
          '#matchingTrack',
        ],

        compute: ({
          ['#matchingAlbum.tracks']: matchingAlbumTracks,
          ['#matchingTrack']: matchingTrack,
        }) =>
          (matchingAlbumTracks.includes(matchingTrack)
            ? matchingTrack
            : null),
      },
    ],

    bandcampTrackIdentifier: simpleString(),
    bandcampArtworkIdentifier: simpleString(),

    additionalNames: thingList({
      class: input.value(AdditionalName),
    }),

    dateFirstReleased: simpleDate(),

    // > Update & expose - Credits and contributors

    artistText: [
      exposeUpdateValueOrContinue({
        validate: input.value(isContentString),
      }),

      withPropertyFromAlbum({
        property: input.value('trackArtistText'),
      }),

      exposeDependency({
        dependency: '#album.trackArtistText',
      }),
    ],

    artistTextInLists: [
      exposeUpdateValueOrContinue({
        validate: input.value(isContentString),
      }),

      exposeDependencyOrContinue({
        dependency: '_artistText',
      }),

      withPropertyFromAlbum({
        property: input.value('trackArtistText'),
      }),

      exposeDependency({
        dependency: '#album.trackArtistText',
      }),
    ],

    artistContribs: [
      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
        thingProperty: input.thisProperty(),
        artistProperty: input.value('trackArtistContributions'),
        date: 'date',
      }).outputs({
        '#resolvedContribs': '#artistContribs',
      }),

      exposeDependencyOrContinue({
        dependency: '#artistContribs',
        mode: input.value('empty'),
      }),

      // Specifically inherit artist contributions later than artist contribs.
      // Secondary releases' artists may differ from the main release.
      inheritContributionListFromMainRelease(),

      withPropertyFromAlbum({
        property: input.value('trackArtistContribs'),
      }),

      withRecontextualizedContributionList({
        list: '#album.trackArtistContribs',
        artistProperty: input.value('trackArtistContributions'),
      }),

      withRedatedContributionList({
        list: '#album.trackArtistContribs',
        date: 'date',
      }),

      exposeDependency({dependency: '#album.trackArtistContribs'}),
    ],

    contributorContribs: [
      inheritContributionListFromMainRelease(),

      contributionList({
        date: 'date',
        artistProperty: input.value('trackContributorContributions'),
      }),
    ],

    // > Update & expose - General configuration

    countInArtistTotals: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromObject({
        object: 'trackSection',
        property: input.value('countTracksInArtistTotals'),
      }),

      exposeDependency({dependency: '#trackSection.countTracksInArtistTotals'}),
    ],

    disableUniqueCoverArt: flag(),
    disableDate: flag(),

    // > Update & expose - General metadata

    duration: duration(),

    color: [
      exposeUpdateValueOrContinue({
        validate: input.value(isColor),
      }),

      withPropertyFromObject({
        object: 'trackSection',
        property: input.value('color'),
      }),

      exposeDependencyOrContinue({dependency: '#trackSection.color'}),

      withPropertyFromAlbum({
        property: input.value('color'),
      }),

      exposeDependency({dependency: '#album.color'}),
    ],

    needsLyrics: [
      exposeUpdateValueOrContinue({
        mode: input.value('falsy'),
        validate: input.value(isBoolean),
      }),

      exitWithoutDependency({
        dependency: '_lyrics',
        mode: input.value('empty'),
        value: input.value(false),
      }),

      withPropertyFromList({
        list: '_lyrics',
        property: input.value('helpNeeded'),
      }),

      {
        dependencies: ['#lyrics.helpNeeded'],
        compute: ({
          ['#lyrics.helpNeeded']: helpNeeded,
        }) =>
          helpNeeded.includes(true)
      },
    ],

    urls: urls(),

    // > Update & expose - Artworks

    trackArtworks: [
      exitWithoutUniqueCoverArt({
        value: input.value([]),
      }),

      constitutibleArtworkList.fromYAMLFieldSpec
        .call(this, 'Track Artwork'),
    ],

    coverArtistContribs: [
      exitWithoutUniqueCoverArt({
        value: input.value([]),
      }),

      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
        thingProperty: input.value('coverArtistContribs'),
        artistProperty: input.value('trackCoverArtistContributions'),
        date: 'coverArtDate',
      }),

      exposeDependencyOrContinue({
        dependency: '#resolvedContribs',
        mode: input.value('empty'),
      }),

      withPropertyFromAlbum({
        property: input.value('trackCoverArtistContribs'),
      }),

      withRecontextualizedContributionList({
        list: '#album.trackCoverArtistContribs',
        artistProperty: input.value('trackCoverArtistContributions'),
      }),

      withRedatedContributionList({
        list: '#album.trackCoverArtistContribs',
        date: 'coverArtDate',
      }),

      exposeDependency({
        dependency: '#album.trackCoverArtistContribs',
      }),
    ],

    coverArtDate: [
      exitWithoutDependency({
        dependency: 'hasUniqueCoverArt',
        mode: input.value('falsy'),
      }),

      exposeUpdateValueOrContinue({
        validate: input.value(isDate),
      }),

      withPropertyFromAlbum({
        property: input.value('trackArtDate'),
      }),

      exposeDependencyOrContinue({
        dependency: '#album.trackArtDate',
      }),

      exposeDependency({
        dependency: 'date',
      }),
    ],

    coverArtFileExtension: [
      exitWithoutUniqueCoverArt(),

      exposeUpdateValueOrContinue({
        validate: input.value(isFileExtension),
      }),

      withPropertyFromAlbum({
        property: input.value('trackCoverArtFileExtension'),
      }),

      exposeDependencyOrContinue({dependency: '#album.trackCoverArtFileExtension'}),

      exposeConstant({
        value: input.value('jpg'),
      }),
    ],

    coverArtDimensions: [
      exitWithoutUniqueCoverArt(),

      exposeUpdateValueOrContinue(),

      withPropertyFromAlbum({
        property: input.value('trackDimensions'),
      }),

      exposeDependencyOrContinue({dependency: '#album.trackDimensions'}),

      dimensions(),
    ],

    artTags: [
      exitWithoutUniqueCoverArt({
        value: input.value([]),
      }),

      referenceList({
        class: input.value(ArtTag),
        find: soupyFind.input('artTag'),
      }),
    ],

    referencedArtworks: [
      exitWithoutUniqueCoverArt({
        value: input.value([]),
      }),

      referencedArtworkList(),
    ],

    // > Update & expose - Referenced tracks

    previousProductionTracks: [
      inheritFromMainRelease(),

      referenceList({
        class: input.value(Track),
        find: soupyFind.input('trackMainReleasesOnly'),
      }),
    ],

    referencedTracks: [
      inheritFromMainRelease(),

      referenceList({
        class: input.value(Track),
        find: soupyFind.input('trackMainReleasesOnly'),
      }),
    ],

    sampledTracks: [
      inheritFromMainRelease(),

      referenceList({
        class: input.value(Track),
        find: soupyFind.input('trackMainReleasesOnly'),
      }),
    ],

    // > Update & expose - Additional files

    additionalFiles: thingList({
      class: input.value(AdditionalFile),
    }),

    sheetMusicFiles: thingList({
      class: input.value(AdditionalFile),
    }),

    midiProjectFiles: thingList({
      class: input.value(AdditionalFile),
    }),

    // > Update & expose - Content entries

    lyrics: [
      // TODO: Inherited lyrics are literally the same objects, so of course
      // their .thing properties aren't going to point back to this one, and
      // certainly couldn't be recontextualized...
      inheritFromMainRelease(),

      thingList({
        class: input.value(LyricsEntry),
      }),
    ],

    commentary: thingList({
      class: input.value(CommentaryEntry),
    }),

    creditingSources: thingList({
      class: input.value(CreditingSourcesEntry),
    }),

    referencingSources: thingList({
      class: input.value(ReferencingSourcesEntry),
    }),

    // > Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // used for referencedArtworkList (mixedFind)
    artworkData: wikiData({
      class: input.value(Artwork),
    }),

    // used for withMatchingContributionPresets (indirectly by Contribution)
    wikiInfo: thing({
      class: input.value(WikiInfo),
    }),

    // > Expose only

    isTrack: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

    commentatorArtists: commentatorArtists(),

    directorySuffix: [
      exitWithoutDependency({
        dependency: 'suffixDirectoryFromAlbum',
        mode: input.value('falsy'),
      }),

      withPropertyFromObject({
        object: 'trackSection',
        property: input.value('directorySuffix'),
      }),

      exposeDependency({
        dependency: '#trackSection.directorySuffix',
      }),
    ],

    date: [
      {
        dependencies: ['disableDate'],
        compute: (continuation, {disableDate}) =>
          (disableDate
            ? null
            : continuation()),
      },

      exposeDependencyOrContinue({
        dependency: 'dateFirstReleased',
      }),

      withPropertyFromAlbum({
        property: input.value('date'),
      }),

      exposeDependency({
        dependency: '#album.date',
      }),
    ],

    trackNumber: [
      withTrackNumber(),
      exposeDependency({dependency: '#trackNumber'}),
    ],

    // Whether or not the track has "unique" cover artwork - a cover which is
    // specifically associated with this track in particular, rather than with
    // the track's album as a whole. This is typically used to select between
    // displaying the track artwork and a fallback, such as the album artwork
    // or a placeholder. (This property is named hasUniqueCoverArt instead of
    // the usual hasCoverArt to emphasize that it does not inherit from the
    // album.)
    //
    // hasUniqueCoverArt is based only around the presence of *specified*
    // cover artist contributions, not whether the references to artists on those
    // contributions actually resolve to anything. It completely evades interacting
    // with find/replace.
    hasUniqueCoverArt: [
      {
        dependencies: ['disableUniqueCoverArt'],
        compute: (continuation, {disableUniqueCoverArt}) =>
          (disableUniqueCoverArt
            ? false
            : continuation()),
      },

      withResultOfAvailabilityCheck({
        from: '_coverArtistContribs',
        mode: input.value('empty'),
      }),

      {
        dependencies: ['#availability'],
        compute: (continuation, {
          ['#availability']: availability,
        }) =>
          (availability
            ? true
            : continuation()),
      },

      withPropertyFromAlbum({
        property: input.value('trackCoverArtistContribs'),
        internal: input.value(true),
      }),

      withResultOfAvailabilityCheck({
        from: '#album.trackCoverArtistContribs',
        mode: input.value('empty'),
      }),

      {
        dependencies: ['#availability'],
        compute: (continuation, {
          ['#availability']: availability,
        }) =>
          (availability
            ? true
            : continuation()),
      },

      exitWithoutDependency({
        dependency: '_trackArtworks',
        mode: input.value('empty'),
        value: input.value(false),
      }),

      withPropertyFromList({
        list: '_trackArtworks',
        property: input.value('artistContribs'),
        internal: input.value(true),
      }),

      // Since we're getting the update value for each artwork's artistContribs,
      // it may not be set at all, and in that case won't be exposing as [].
      fillMissingListItems({
        list: '#trackArtworks.artistContribs',
        fill: input.value([]),
      }),

      withFlattenedList({
        list: '#trackArtworks.artistContribs',
      }),

      withResultOfAvailabilityCheck({
        from: '#flattenedList',
        mode: input.value('empty'),
      }),

      exposeDependency({
        dependency: '#availability',
      }),
    ],

    isMainRelease: [
      exposeWhetherDependencyAvailable({
        dependency: 'mainReleaseTrack',
        negate: input.value(true),
      }),
    ],

    isSecondaryRelease: [
      exposeWhetherDependencyAvailable({
        dependency: 'mainReleaseTrack',
      }),
    ],

    mainReleaseTrack: [
      exitWithoutDependency({
        dependency: 'mainRelease',
      }),

      withPropertyFromObject({
        object: 'mainRelease',
        property: input.value('isTrack'),
      }),

      {
        dependencies: ['mainRelease', '#mainRelease.isTrack'],
        compute: (continuation, {
          ['mainRelease']: mainRelease,
          ['#mainRelease.isTrack']: mainReleaseIsTrack,
        }) =>
          (mainReleaseIsTrack
            ? mainRelease
            : continuation()),
      },

      {
        dependencies: ['name', '_directory'],
        compute: (continuation, {
          ['name']: ownName,
          ['_directory']: ownDirectory,
        }) => {
          const ownNameKebabed = getKebabCase(ownName);

          return continuation({
            ['#mapItsNameLikeName']:
              name => getKebabCase(name) === ownNameKebabed,

            ['#mapItsDirectoryLikeDirectory']:
              (ownDirectory
                ? directory => directory === ownDirectory
                : () => false),

            ['#mapItsNameLikeDirectory']:
              (ownDirectory
                ? name => getKebabCase(name) === ownDirectory
                : () => false),

            ['#mapItsDirectoryLikeName']:
              directory => directory === ownNameKebabed,
          });
        },
      },

      withPropertyFromObject({
        object: 'mainRelease',
        property: input.value('tracks'),
      }),

      withPropertyFromList({
        list: '#mainRelease.tracks',
        property: input.value('mainRelease'),
        internal: input.value(true),
      }),

      withAvailabilityFilter({
        from: '#mainRelease.tracks.mainRelease',
      }),

      withMappedList({
        list: '#availabilityFilter',
        map: input.value(item => !item),
      }).outputs({
        '#mappedList': '#availabilityFilter',
      }),

      withFilteredList({
        list: '#mainRelease.tracks',
        filter: '#availabilityFilter',
      }).outputs({
        '#filteredList': '#mainRelease.tracks',
      }),

      withPropertyFromList({
        list: '#mainRelease.tracks',
        property: input.value('name'),
      }),

      withPropertyFromList({
        list: '#mainRelease.tracks',
        property: input.value('directory'),
        internal: input.value(true),
      }),

      withMappedList({
        list: '#mainRelease.tracks.name',
        map: '#mapItsNameLikeName',
      }).outputs({
        '#mappedList': '#filterItsNameLikeName',
      }),

      withMappedList({
        list: '#mainRelease.tracks.directory',
        map: '#mapItsDirectoryLikeDirectory',
      }).outputs({
        '#mappedList': '#filterItsDirectoryLikeDirectory',
      }),

      withMappedList({
        list: '#mainRelease.tracks.name',
        map: '#mapItsNameLikeDirectory',
      }).outputs({
        '#mappedList': '#filterItsNameLikeDirectory',
      }),

      withMappedList({
        list: '#mainRelease.tracks.directory',
        map: '#mapItsDirectoryLikeName',
      }).outputs({
        '#mappedList': '#filterItsDirectoryLikeName',
      }),

      withFilteredList({
        list: '#mainRelease.tracks',
        filter: '#filterItsNameLikeName',
      }).outputs({
        '#filteredList': '#matchingItsNameLikeName',
      }),

      withFilteredList({
        list: '#mainRelease.tracks',
        filter: '#filterItsDirectoryLikeDirectory',
      }).outputs({
        '#filteredList': '#matchingItsDirectoryLikeDirectory',
      }),

      withFilteredList({
        list: '#mainRelease.tracks',
        filter: '#filterItsNameLikeDirectory',
      }).outputs({
        '#filteredList': '#matchingItsNameLikeDirectory',
      }),

      withFilteredList({
        list: '#mainRelease.tracks',
        filter: '#filterItsDirectoryLikeName',
      }).outputs({
        '#filteredList': '#matchingItsDirectoryLikeName',
      }),

      {
        dependencies: [
          '#matchingItsNameLikeName',
          '#matchingItsDirectoryLikeDirectory',
          '#matchingItsNameLikeDirectory',
          '#matchingItsDirectoryLikeName',
        ],

        compute: (continuation, {
          ['#matchingItsNameLikeName']:           NLN,
          ['#matchingItsDirectoryLikeDirectory']: DLD,
          ['#matchingItsNameLikeDirectory']:      NLD,
          ['#matchingItsDirectoryLikeName']:      DLN,
        }) => continuation({
          ['#mainReleaseTrack']:
            onlyItem(DLD) ??
            onlyItem(NLN) ??
            onlyItem(DLN) ??
            onlyItem(NLD) ??
            null,
        }),
      },

      {
        dependencies: ['#mainReleaseTrack', input.myself()],
        compute: ({
          ['#mainReleaseTrack']: mainReleaseTrack,
          [input.myself()]: thisTrack,
        }) =>
          (mainReleaseTrack === thisTrack
            ? null
            : mainReleaseTrack),
      },
    ],

    // Only has any value for main releases, because secondary releases
    // are never secondary to *another* secondary release.
    secondaryReleases: reverseReferenceList({
      reverse: soupyReverse.input('tracksWhichAreSecondaryReleasesOf'),
    }),

    allReleases: [
      {
        dependencies: [
          'mainReleaseTrack',
          'secondaryReleases',
          input.myself(),
        ],

        compute: (continuation, {
          mainReleaseTrack,
          secondaryReleases,
          [input.myself()]: thisTrack,
        }) =>
          (mainReleaseTrack
            ? continuation({
                ['#mainReleaseTrack']: mainReleaseTrack,
                ['#secondaryReleaseTracks']: mainReleaseTrack.secondaryReleases,
              })
            : continuation({
                ['#mainReleaseTrack']: thisTrack,
                ['#secondaryReleaseTracks']: secondaryReleases,
              })),
      },

      {
        dependencies: [
          '#mainReleaseTrack',
          '#secondaryReleaseTracks',
        ],

        compute: ({
          ['#mainReleaseTrack']: mainReleaseTrack,
          ['#secondaryReleaseTracks']: secondaryReleaseTracks,
        }) =>
          sortByDate([mainReleaseTrack, ...secondaryReleaseTracks]),
      },
    ],

    otherReleases: [
      {
        dependencies: [input.myself(), 'allReleases'],
        compute: ({
          [input.myself()]: thisTrack,
          ['allReleases']: allReleases,
        }) =>
          allReleases.filter(track => track !== thisTrack),
      },
    ],

    commentaryFromMainRelease: [
      exitWithoutDependency({
        dependency: 'mainReleaseTrack',
        value: input.value([]),
      }),

      withPropertyFromObject({
        object: 'mainReleaseTrack',
        property: input.value('commentary'),
      }),

      exposeDependency({
        dependency: '#mainReleaseTrack.commentary',
      }),
    ],

    groups: [
      withPropertyFromAlbum({
        property: input.value('groups'),
      }),

      exposeDependency({
        dependency: '#album.groups',
      }),
    ],

    followingProductionTracks: reverseReferenceList({
      reverse: soupyReverse.input('tracksWhichAreFollowingProductionsOf'),
    }),

    referencedByTracks: reverseReferenceList({
      reverse: soupyReverse.input('tracksWhichReference'),
    }),

    sampledByTracks: reverseReferenceList({
      reverse: soupyReverse.input('tracksWhichSample'),
    }),

    featuredInFlashes: reverseReferenceList({
      reverse: soupyReverse.input('flashesWhichFeature'),
    }),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      // Identifying metadata

      'Track': {property: 'name'},
      'Track Text': {property: 'nameText'},
      'Directory': {property: 'directory'},
      'Suffix Directory': {property: 'suffixDirectoryFromAlbum'},
      'Always Reference By Directory': {property: 'alwaysReferenceByDirectory'},
      'Main Release': {property: 'mainRelease'},

      'Bandcamp Track ID': {
        property: 'bandcampTrackIdentifier',
        transform: String,
      },

      'Bandcamp Artwork ID': {
        property: 'bandcampArtworkIdentifier',
        transform: String,
      },

      'Additional Names': {
        property: 'additionalNames',
        transform: parseAdditionalNames,
      },

      'Date First Released': {
        property: 'dateFirstReleased',
        transform: parseDate,
      },

      // Credits and contributors

      'Artist Text': {property: 'artistText'},
      'Artist Text In Lists': {property: 'artistTextInLists'},

      'Artists': {
        property: 'artistContribs',
        transform: parseContributors,
      },

      'Contributors': {
        property: 'contributorContribs',
        transform: parseContributors,
      },

      // General configuration

      'Count In Artist Totals': {property: 'countInArtistTotals'},

      'Has Cover Art': {
        property: 'disableUniqueCoverArt',
        transform: value =>
          (typeof value === 'boolean'
            ? !value
            : value),
      },

      'Has Date': {
        property: 'disableDate',
        transform: value =>
          (typeof value === 'boolean'
            ? !value
            : value),
      },

      // General metadata

      'Duration': {
        property: 'duration',
        transform: parseDuration,
      },

      'Color': {property: 'color'},

      'Needs Lyrics': {
        property: 'needsLyrics',
      },

      'URLs': {property: 'urls'},

      // Artworks

      'Track Artwork': {
        property: 'trackArtworks',
        transform:
          parseArtwork({
            thingProperty: 'trackArtworks',
            dimensionsFromThingProperty: 'coverArtDimensions',
            fileExtensionFromThingProperty: 'coverArtFileExtension',
            dateFromThingProperty: 'coverArtDate',
            artTagsFromThingProperty: 'artTags',
            referencedArtworksFromThingProperty: 'referencedArtworks',
            artistContribsFromThingProperty: 'coverArtistContribs',
            artistContribsArtistProperty: 'trackCoverArtistContributions',
          }),
      },

      'Cover Artists': {
        property: 'coverArtistContribs',
        transform: parseContributors,
      },

      'Cover Art Date': {
        property: 'coverArtDate',
        transform: parseDate,
      },

      'Cover Art File Extension': {property: 'coverArtFileExtension'},

      'Cover Art Dimensions': {
        property: 'coverArtDimensions',
        transform: parseDimensions,
      },

      'Art Tags': {property: 'artTags'},

      'Referenced Artworks': {
        property: 'referencedArtworks',
        transform: parseAnnotatedReferences,
      },

      // Referenced tracks

      'Previous Productions': {property: 'previousProductionTracks'},
      'Referenced Tracks': {property: 'referencedTracks'},
      'Sampled Tracks': {property: 'sampledTracks'},

      // Additional files

      'Additional Files': {
        property: 'additionalFiles',
        transform: parseAdditionalFiles,
      },

      'Sheet Music Files': {
        property: 'sheetMusicFiles',
        transform: parseAdditionalFiles,
      },

      'MIDI Project Files': {
        property: 'midiProjectFiles',
        transform: parseAdditionalFiles,
      },

      // Content entries

      'Lyrics': {
        property: 'lyrics',
        transform: parseLyrics,
      },

      'Commentary': {
        property: 'commentary',
        transform: parseCommentary,
      },

      'Crediting Sources': {
        property: 'creditingSources',
        transform: parseCreditingSources,
      },

      'Referencing Sources': {
        property: 'referencingSources',
        transform: parseReferencingSources,
      },

      // Shenanigans

      'Franchises': {ignore: true},
      'Inherit Franchises': {ignore: true},
      'Review Points': {ignore: true},
    },

    invalidFieldCombinations: [
      {message: `Secondary releases never count in artist totals`, fields: [
        'Main Release',
        'Count In Artist Totals',
      ]},

      {message: `Secondary releases inherit references from the main one`, fields: [
        'Main Release',
        'Referenced Tracks',
      ]},

      {message: `Secondary releases inherit samples from the main one`, fields: [
        'Main Release',
        'Sampled Tracks',
      ]},

      {message: `Secondary releases inherit contributors from the main one`, fields: [
        'Main Release',
        'Contributors',
      ]},

      {message: `Secondary releases inherit lyrics from the main one`, fields: [
        'Main Release',
        'Lyrics',
      ]},

      {
        message: ({'Has Cover Art': hasCoverArt}) =>
          (hasCoverArt
            ? `"Has Cover Art: true" is inferred from cover artist credits`
            : `Tracks without cover art must not have cover artist credits`),

        fields: [
          'Has Cover Art',
          'Cover Artists',
        ],
      },
    ],
  };

  static [Thing.findSpecs] = {
    track: {
      referenceTypes: ['track'],

      bindTo: 'trackData',

      getMatchableNames: track =>
        (track.alwaysReferenceByDirectory
          ? []
          : [track.name]),
    },

    trackMainReleasesOnly: {
      referenceTypes: ['track'],
      bindTo: 'trackData',

      include: track =>
        !CacheableObject.getUpdateValue(track, 'mainRelease'),

      // It's still necessary to check alwaysReferenceByDirectory here, since
      // it may be set manually (with `Always Reference By Directory: true`),
      // and these shouldn't be matched by name (as per usual).
      // See the definition for that property for more information.
      getMatchableNames: track =>
        (track.alwaysReferenceByDirectory
          ? []
          : [track.name]),
    },

    trackWithArtwork: {
      referenceTypes: [
        'track',
        'track-referencing-artworks',
        'track-referenced-artworks',
      ],

      bindTo: 'trackData',

      include: track =>
        track.hasUniqueCoverArt,

      getMatchableNames: track =>
        (track.alwaysReferenceByDirectory
          ? []
          : [track.name]),
    },

    trackPrimaryArtwork: {
      [Thing.findThisThingOnly]: false,

      referenceTypes: [
        'track',
        'track-referencing-artworks',
        'track-referenced-artworks',
      ],

      bindTo: 'artworkData',

      include: (artwork, {Artwork, Track}) =>
        artwork instanceof Artwork &&
        artwork.thing instanceof Track &&
        artwork === artwork.thing.trackArtworks[0],

      getMatchableNames: ({thing: track}) =>
        (track.alwaysReferenceByDirectory
          ? []
          : [track.name]),

      getMatchableDirectories: ({thing: track}) =>
        [track.directory],
    },
  };

  static [Thing.reverseSpecs] = {
    tracksWhichReference: {
      bindTo: 'trackData',

      referencing: track => track.isMainRelease ? [track] : [],
      referenced: track => track.referencedTracks,
    },

    tracksWhichSample: {
      bindTo: 'trackData',

      referencing: track => track.isMainRelease ? [track] : [],
      referenced: track => track.sampledTracks,
    },

    tracksWhoseArtworksFeature: {
      bindTo: 'trackData',

      referencing: track => [track],
      referenced: track => track.artTags,
    },

    trackArtistContributionsBy:
      soupyReverse.contributionsBy('trackData', 'artistContribs'),

    trackContributorContributionsBy:
      soupyReverse.contributionsBy('trackData', 'contributorContribs'),

    trackCoverArtistContributionsBy:
      soupyReverse.artworkContributionsBy('trackData', 'trackArtworks'),

    tracksWithCommentaryBy: {
      bindTo: 'trackData',

      referencing: track => [track],
      referenced: track => track.commentatorArtists,
    },

    tracksWhichAreSecondaryReleasesOf: {
      bindTo: 'trackData',

      referencing: track => track.isSecondaryRelease ? [track] : [],
      referenced: track => [track.mainReleaseTrack],
    },

    tracksWhichAreFollowingProductionsOf: {
      bindTo: 'trackData',

      referencing: track => track,
      referenced: track => track.previousProductionTracks,
    },
  };

  // Track YAML loading is handled in album.js.
  static [Thing.getYamlLoadingSpec] = null;

  getOwnAdditionalFilePath(_file, filename) {
    if (!this.album) return null;

    return [
      'media.albumAdditionalFile',
      this.album.directory,
      filename,
    ];
  }

  getOwnArtworkPath(artwork) {
    if (!this.album) return null;

    return [
      'media.trackCover',
      this.album.directory,

      (artwork.unqualifiedDirectory
        ? this.directory + '-' + artwork.unqualifiedDirectory
        : this.directory),

      artwork.fileExtension,
    ];
  }

  countOwnContributionInContributionTotals(_contrib) {
    if (!this.countInArtistTotals) {
      return false;
    }

    if (this.isSecondaryRelease) {
      return false;
    }

    return true;
  }

  countOwnContributionInDurationTotals(_contrib) {
    if (!this.countInArtistTotals) {
      return false;
    }

    if (this.isSecondaryRelease) {
      return false;
    }

    return true;
  }

  [inspect.custom](depth) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (CacheableObject.getUpdateValue(this, 'mainRelease')) {
      parts.unshift(`${colors.yellow('[secrelease]')} `);
    }

    let album;

    if (depth >= 0) {
      album = this.album;
    }

    if (album) {
      const albumName = album.name;
      const albumIndex = album.tracks.indexOf(this);
      const trackNum =
        (albumIndex === -1
          ? 'indeterminate position'
          : `#${albumIndex + 1}`);
      parts.push(` (${colors.yellow(trackNum)} in ${colors.green(albumName)})`);
    }

    return parts.join('');
  }
}
