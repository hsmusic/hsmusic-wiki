import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {input, V} from '#composite';
import find, {keyRefRegex} from '#find';
import {onlyItem} from '#sugar';
import {sortByDate, sortFlashesChronologically} from '#sort';
import Thing from '#thing';
import {compareKebabCase} from '#wiki-data';

import {
  anyOf,
  is,
  isBoolean,
  isColor,
  isContentString,
  isContributionList,
  isDate,
  isExcludingURLsReason,
  isFileExtension,
  validateReference,
} from '#validators';

import {
  flipBoolean,
  parseAdditionalFiles,
  parseAdditionalNames,
  parseAlwaysReferenceByDirectory,
  parseAnnotatedReferences,
  parseArtwork,
  parseCommentary,
  parseContributors,
  parseCreditingSources,
  parseExcludingURLs,
  parseDate,
  parseDimensions,
  parseDuration,
  parseLyrics,
  parseMusicVideos,
  parseReferencingSources,
  parseURLs,
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
  withIndexInList,
  withMappedList,
  withPropertiesFromObject,
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
  inheritContributionListFromMainRelease,
  inheritFromMainRelease,
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
    MusicVideo,
    ReferencingSourcesEntry,
    TrackArtistContribution,
    TrackSection,
    WikiInfo,
  }) => ({
    // > Update & expose - Internal relationships

    album: thing(V(Album)),
    trackSection: thing(V(TrackSection)),

    // > Update & expose - Identifying metadata

    name: name(V('Unnamed Track')),
    nameText: contentString(),

    nameStyle: [
      exposeUpdateValueOrContinue({
        validate: input.value(is(...[
          'normal',
          'utility',
          'unofficial',
        ])),
      }),

      exposeConstant(V('normal')),
    ],

    nameDetail: simpleString(),

    directory: directory({
      suffix: 'directorySuffix',
    }),

    suffixDirectoryFromAlbum: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromObject('trackSection', V('suffixTrackDirectories')),
      exposeDependency('#trackSection.suffixTrackDirectories'),
    ],

    referenceByDirectory: [
      exposeUpdateValueOrContinue({
        validate: input.value(
          is(...[
            'always',
            'outside album',
            // 'outside groups',
            'normally',
          ])),
      }),

      withPropertyFromObject('album', V('referenceTracksByDirectory')),

      {
        dependencies: ['#album.referenceTracksByDirectory'],
        compute: (continuation, {
          ['#album.referenceTracksByDirectory']: referenceTracksByDirectory,
        }) =>
          (referenceTracksByDirectory === 'normally'
            ? continuation()
            : referenceTracksByDirectory),
      },

      exitWithoutDependency('_mainRelease', V('normally')),
      exitWithoutDependency('mainReleaseTrack', V('normally')),

      withPropertyFromObject('mainReleaseTrack', V('name')),

      {
        dependencies: ['name', '#mainReleaseTrack.name'],
        compute: ({
          ['name']: name,
          ['#mainReleaseTrack.name']: mainReleaseName,
        }) =>
          (compareKebabCase(name, mainReleaseName)
            ? 'always'
            : 'normally'),
      },
    ],

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

      exposeDependencyOrContinue('#sameNameSingle'),
      exposeDependencyOrContinue('#matchingAlbum'),
      exposeDependency('#matchingTrack'),
    ],

    bandcampTrackIdentifier: simpleString(),
    bandcampArtworkIdentifier: simpleString(),

    additionalNames: thingList(V(AdditionalName)),

    dateFirstReleased: simpleDate(),

    // > Update & expose - Credits and contributors

    artistText: [
      exposeUpdateValueOrContinue({
        validate: input.value(isContentString),
      }),

      withPropertyFromObject('album', V('trackArtistText')),
      exposeDependency('#album.trackArtistText'),
    ],

    artistTextInLists: [
      exposeUpdateValueOrContinue({
        validate: input.value(isContentString),
      }),

      exposeDependencyOrContinue('_artistText'),

      withPropertyFromObject('album', V('trackArtistText')),
      exposeDependency('#album.trackArtistText'),
    ],

    artistContribs: [
      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
        class: input.value(TrackArtistContribution),
        date: 'date',
        thingProperty: input.thisProperty(),
        artistProperty: input.value('trackArtistContributions'),
      }).outputs({
        '#resolvedContribs': '#artistContribs',
      }),

      exposeDependencyOrContinue('#artistContribs', V('empty')),

      withPropertyFromObject('album', V('trackArtistContribs')),

      withRecontextualizedContributionList({
        list: '#album.trackArtistContribs',
        artistProperty: input.value('trackArtistContributions'),
      }),

      withRedatedContributionList({
        list: '#album.trackArtistContribs',
        date: 'date',
      }),

      exposeDependency('#album.trackArtistContribs'),
    ],

    contributorContribs: [
      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
        date: 'date',
        thingProperty: input.thisProperty(),
        artistProperty: input.value('trackContributorContributions'),
      }).outputs({
        '#resolvedContribs': '#contributorContribs',
      }),

      exposeDependencyOrContinue('#contributorContribs', V('empty')),

      inheritContributionListFromMainRelease(),

      exposeConstant(V([])),
    ],

    // > Update & expose - General configuration

    countInArtistTotals: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromObject('trackSection', V('countTracksInArtistTotals')),
      exposeDependency('#trackSection.countTracksInArtistTotals'),
    ],

    showInReferenceLists: flag(V(true)),

    disableUniqueCoverArt: flag(V(false)),
    disableDate: flag(V(false)),

    // > Update & expose - General metadata

    duration: duration(),

    color: [
      exposeUpdateValueOrContinue({
        validate: input.value(isColor),
      }),

      withPropertyFromObject('trackSection', V('color')),
      exposeDependency('#trackSection.color'),
    ],

    needsLyrics: [
      exposeUpdateValueOrContinue({
        mode: input.value('falsy'),
        validate: input.value(isBoolean),
      }),

      exitWithoutDependency('_lyrics', {
        value: input.value(false),
        mode: input.value('empty'),
      }),

      withPropertyFromList('_lyrics', V('helpNeeded')),

      {
        dependencies: ['#lyrics.helpNeeded'],
        compute: ({
          ['#lyrics.helpNeeded']: helpNeeded,
        }) =>
          helpNeeded.includes(true)
      },
    ],

    excludingURLs: [
      exposeUpdateValueOrContinue({
        validate: input.value(
          anyOf(
            is(false),
            isExcludingURLsReason)),
      }),

      withPropertyFromObject('trackSection', V('excludingTrackURLs')),
      exposeDependency('#trackSection.excludingTrackURLs'),
    ],

    urls: [
      {
        dependencies: ['excludingURLs'],
        compute: (continuation, {excludingURLs}) =>
          (excludingURLs
            ? continuation.exit([])
            : continuation()),
      },

      urls(),
    ],

    // > Update & expose - Artworks

    trackArtworks: [
      exitWithoutDependency('hasUniqueCoverArt', {
        value: input.value([]),
        mode: input.value('falsy'),
      }),

      constitutibleArtworkList.fromYAMLFieldSpec
        .call(this, 'Track Artwork'),
    ],

    coverArtistContribs: [
      exitWithoutDependency('hasUniqueCoverArt', {
        value: input.value([]),
        mode: input.value('falsy'),
      }),

      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
        date: 'coverArtDate',
        thingProperty: input.value('coverArtistContribs'),
        artistProperty: input.value('trackCoverArtistContributions'),
      }),

      exposeDependencyOrContinue('#resolvedContribs', V('empty')),

      withPropertyFromObject('album', V('trackCoverArtistContribs')),

      withRecontextualizedContributionList({
        list: '#album.trackCoverArtistContribs',
        artistProperty: input.value('trackCoverArtistContributions'),
      }),

      withRedatedContributionList({
        list: '#album.trackCoverArtistContribs',
        date: 'coverArtDate',
      }),

      exposeDependency('#album.trackCoverArtistContribs'),
    ],

    coverArtDate: [
      exitWithoutDependency('hasUniqueCoverArt', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      exposeUpdateValueOrContinue({
        validate: input.value(isDate),
      }),

      withPropertyFromObject('album', V('trackArtDate')),
      exposeDependencyOrContinue('#album.trackArtDate'),

      exposeDependency('date'),
    ],

    coverArtFileExtension: [
      exitWithoutDependency('hasUniqueCoverArt', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      exposeUpdateValueOrContinue({
        validate: input.value(isFileExtension),
      }),

      withPropertyFromObject('album', V('trackCoverArtFileExtension')),
      exposeDependencyOrContinue('#album.trackCoverArtFileExtension'),

      exposeConstant(V('jpg')),
    ],

    coverArtDimensions: [
      exitWithoutDependency('hasUniqueCoverArt', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      exposeUpdateValueOrContinue(),

      withPropertyFromObject('album', V('trackDimensions')),
      exposeDependencyOrContinue('#album.trackDimensions'),

      dimensions(),
    ],

    artTags: [
      exitWithoutDependency('hasUniqueCoverArt', {
        value: input.value([]),
        mode: input.value('falsy'),
      }),

      referenceList({
        class: input.value(ArtTag),
        find: soupyFind.input('artTag'),
      }),
    ],

    referencedArtworks: [
      exitWithoutDependency('hasUniqueCoverArt', {
        value: input.value([]),
        mode: input.value('falsy'),
      }),

      referencedArtworkList(),
    ],

    // > Update & expose - Referenced tracks

    referencedTracks: [
      inheritFromMainRelease(),

      referenceList({
        class: input.value(Track),
        find: soupyFind.input('trackReference'),
      }),
    ],

    sampledTracks: [
      inheritFromMainRelease(),

      referenceList({
        class: input.value(Track),
        find: soupyFind.input('trackReference'),
      }),
    ],

    // > Update & expose - Music videos

    musicVideos: [
      exposeUpdateValueOrContinue(),

      // TODO: Same situation as lyrics. Inherited music videos don't set
      // the proper .thing property back to this track... but then, it needs
      // to keep a reference to its original .thing to get its proper path,
      // so maybe this is okay...
      inheritFromMainRelease(),

      thingList(V(MusicVideo)),
    ],

    // > Update & expose - Additional files

    additionalFiles: thingList(V(AdditionalFile)),
    sheetMusicFiles: thingList(V(AdditionalFile)),
    midiProjectFiles: thingList(V(AdditionalFile)),

    // > Update & expose - Content entries

    lyrics: [
      exposeUpdateValueOrContinue(),

      // TODO: Inherited lyrics are literally the same objects, so of course
      // their .thing properties aren't going to point back to this one, and
      // certainly couldn't be recontextualized...
      inheritFromMainRelease(),

      thingList(V(LyricsEntry)),
    ],

    commentary: thingList(V(CommentaryEntry)),
    creditingSources: thingList(V(CreditingSourcesEntry)),
    referencingSources: thingList(V(ReferencingSourcesEntry)),

    // > Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // used for referencedArtworkList (mixedFind)
    artworkData: wikiData(V(Artwork)),

    // used for withMatchingContributionPresets (indirectly by Contribution)
    wikiInfo: thing(V(WikiInfo)),

    // > Expose only

    isTrack: exposeConstant(V(true)),

    commentatorArtists: commentatorArtists(),

    directorySuffix: [
      exitWithoutDependency('suffixDirectoryFromAlbum', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      withPropertyFromObject('trackSection', V('directorySuffix')),
      exposeDependency('#trackSection.directorySuffix'),
    ],

    date: [
      {
        dependencies: ['disableDate'],
        compute: (continuation, {disableDate}) =>
          (disableDate
            ? null
            : continuation()),
      },

      exposeDependencyOrContinue('dateFirstReleased'),

      withPropertyFromObject('album', V('date')),
      exposeDependency('#album.date'),
    ],

    trackNumber: [
      // Zero is the fallback, not one, but in most albums the first track
      // (and its intended output by this composition) will be one.

      exitWithoutDependency('trackSection', V(0)),
      withPropertiesFromObject('trackSection', V(['tracks', 'startCountingFrom'])),

      withIndexInList('#trackSection.tracks', input.myself()),
      exitWithoutDependency('#index', V(0), V('index')),

      {
        dependencies: ['#trackSection.startCountingFrom', '#index'],
        compute: ({
          ['#trackSection.startCountingFrom']: startCountingFrom,
          ['#index']: index,
        }) => startCountingFrom + index,
      },
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

      withPropertyFromObject('album', {
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

      exitWithoutDependency('_trackArtworks', {
        value: input.value(false),
        mode: input.value('empty'),
      }),

      withPropertyFromList('_trackArtworks', {
        property: input.value('artistContribs'),
        internal: input.value(true),
      }),

      // Since we're getting the update value for each artwork's artistContribs,
      // it may not be set at all, and in that case won't be exposing as [].
      fillMissingListItems('#trackArtworks.artistContribs', V([])),

      withFlattenedList('#trackArtworks.artistContribs'),

      exposeWhetherDependencyAvailable({
        dependency: '#flattenedList',
        mode: input.value('empty'),
      }),
    ],

    isMainRelease:
      exposeWhetherDependencyAvailable({
        dependency: 'mainReleaseTrack',
        negate: input.value(true),
      }),

    isSecondaryRelease:
      exposeWhetherDependencyAvailable({
        dependency: 'mainReleaseTrack',
      }),

    mainReleaseTrack: [
      exitWithoutDependency('mainRelease'),

      withPropertyFromObject('mainRelease', V('isTrack')),

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
        }) => continuation({
          ['#mapItsNameLikeName']:
            itsName => compareKebabCase(itsName, ownName),

          ['#mapItsDirectoryLikeDirectory']:
            (ownDirectory
              ? itsDirectory => itsDirectory === ownDirectory
              : () => false),

          ['#mapItsNameLikeDirectory']:
            (ownDirectory
              ? itsName => compareKebabCase(itsName, ownDirectory)
              : () => false),

          ['#mapItsDirectoryLikeName']:
            itsDirectory => compareKebabCase(itsDirectory, ownName),
        }),
      },

      withPropertyFromObject('mainRelease', V('tracks')),

      withPropertyFromList('#mainRelease.tracks', {
        property: input.value('mainRelease'),
        internal: input.value(true),
      }),

      withAvailabilityFilter({from: '#mainRelease.tracks.mainRelease'}),

      withMappedList({
        list: '#availabilityFilter',
        map: input.value(item => !item),
      }).outputs({
        '#mappedList': '#availabilityFilter',
      }),

      withFilteredList('#mainRelease.tracks', '#availabilityFilter')
        .outputs({'#filteredList': '#mainRelease.tracks'}),

      withPropertyFromList('#mainRelease.tracks', V('name')),

      withPropertyFromList('#mainRelease.tracks', {
        property: input.value('directory'),
        internal: input.value(true),
      }),

      withMappedList('#mainRelease.tracks.name', '#mapItsNameLikeName')
        .outputs({'#mappedList': '#filterItsNameLikeName'}),

      withMappedList('#mainRelease.tracks.directory', '#mapItsDirectoryLikeDirectory')
        .outputs({'#mappedList': '#filterItsDirectoryLikeDirectory'}),

      withMappedList('#mainRelease.tracks.name', '#mapItsNameLikeDirectory')
        .outputs({'#mappedList': '#filterItsNameLikeDirectory'}),

      withMappedList('#mainRelease.tracks.directory', '#mapItsDirectoryLikeName')
        .outputs({'#mappedList': '#filterItsDirectoryLikeName'}),

      withFilteredList('#mainRelease.tracks', '#filterItsNameLikeName')
        .outputs({'#filteredList': '#matchingItsNameLikeName'}),

      withFilteredList('#mainRelease.tracks', '#filterItsDirectoryLikeDirectory')
        .outputs({'#filteredList': '#matchingItsDirectoryLikeDirectory'}),

      withFilteredList('#mainRelease.tracks', '#filterItsNameLikeDirectory')
        .outputs({'#filteredList': '#matchingItsNameLikeDirectory'}),

      withFilteredList('#mainRelease.tracks', '#filterItsDirectoryLikeName')
        .outputs({'#filteredList': '#matchingItsDirectoryLikeName'}),

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
      exitWithoutDependency('mainReleaseTrack', V([])),

      withPropertyFromObject('mainReleaseTrack', V('commentary')),
      exposeDependency('#mainReleaseTrack.commentary'),
    ],

    groups: [
      withPropertyFromObject('album', V('groups')),
      exposeDependency('#album.groups'),
    ],

    referencedByTracks: reverseReferenceList({
      reverse: soupyReverse.input('tracksWhichReference'),
    }),

    sampledByTracks: reverseReferenceList({
      reverse: soupyReverse.input('tracksWhichSample'),
    }),

    ownFeaturedInFlashes: reverseReferenceList({
      reverse: soupyReverse.input('flashesWhichFeature'),
    }),

    featuredInFlashes: [
      {
        dependencies: ['allReleases'],
        compute: (continuation, {allReleases}) => continuation({
          ['#data']:
            allReleases.flatMap(track =>
              track.ownFeaturedInFlashes.map(flash => ({
                flash,
                track,

                // These properties are used for the upcoming sort.
                act: flash.act,
                date: flash.date,
              }))),
        }),
      },

      {
        dependencies: ['#data'],
        compute: (continuation, {'#data': data}) => continuation({
          ['#sortedData']:
            sortFlashesChronologically(data),
        }),
      },

      {
        dependencies: ['#sortedData'],
        compute: ({'#sortedData': sortedData}) =>
          sortedData.map(item => ({
            flash: item.flash,
            as: item.track,
          })),
      },
    ],
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      // Identifying metadata

      'Track': {property: 'name'},
      'Track Text': {property: 'nameText'},

      'Name Style': {property: 'nameStyle'},
      'Name Detail': {property: 'nameDetail'},

      'Directory': {property: 'directory'},
      'Suffix Directory': {property: 'suffixDirectoryFromAlbum'},

      'Reference By Directory': {property: 'referenceByDirectory'},

      'Always Reference By Directory': {
        property: 'referenceByDirectory',
        transform: parseAlwaysReferenceByDirectory,
      },

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
      'Show In Reference Lists': {property: 'showInReferenceLists'},

      'Has Cover Art': {
        property: 'disableUniqueCoverArt',
        transform: flipBoolean,
      },

      'Has Date': {
        property: 'disableDate',
        transform: flipBoolean,
      },

      // General metadata

      'Duration': {
        property: 'duration',
        transform: parseDuration,
      },

      'Color': {
        property: 'color',
      },

      'Needs Lyrics': {
        property: 'needsLyrics',
      },

      'Excluding URLs': {
        property: 'excludingURLs',
        transform: parseExcludingURLs,
      },

      'URLs': {
        property: 'urls',
        transform: parseURLs,
      },

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

      'Referenced Tracks': {property: 'referencedTracks'},
      'Sampled Tracks': {property: 'sampledTracks'},

      // Music videos

      'Music Videos': {
        property: 'musicVideos',
        transform: parseMusicVideos,
      },

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

      {message: `Don't include URLs alongside Excluding URLs, unless Excluding URLs is false`, fields: [
        'URLs',
        ['Excluding URLs', v => v !== false],
      ]},
    ],
  };

  static [Thing.findSpecs] = {
    track: {
      referenceTypes: ['track'],

      bindTo: 'trackData',

      // When referencing without any particular context, all values
      // except for 'normally' count against referencing by name.
      getMatchableNames: track =>
        (track.referenceByDirectory === 'normally'
          ? [track.name]
          : []),
    },

    trackMainReleasesOnly: {
      referenceTypes: ['track'],
      bindTo: 'trackData',

      include: track =>
        !CacheableObject.getUpdateValue(track, 'mainRelease'),

      // This is an acontextual reference.
      getMatchableNames: track =>
        (track.referenceByDirectory === 'normally'
          ? [track.name]
          : []),
    },

    trackReference: {
      referenceTypes: ['track'],
      bindTo: 'trackData',

      byob(fullRef, data, opts) {
        const {from} = opts;

        const acontextual = () =>
          find.trackMainReleasesOnly(fullRef, data, opts);

        const regexMatch = fullRef.match(keyRefRegex);
        if (!regexMatch || regexMatch?.keyPart) {
          // It's a reference by directory or it's malformed.
          // Either way, we can't handle it here!
          return acontextual();
        }

        if (!from?.isTrack) {
          throw new Error(
            `Expected to find starting from a track, got: ` +
            inspect(from, {compact: true}));
        }

        const referencingTrack = from;
        const referencedName = fullRef;

        for (const track of referencingTrack.album.tracks) {
          if (track.referenceByDirectory === 'always') {
            continue;
          }

          if (track.name === referencedName) {
            if (track.isSecondaryRelease) {
              return track.mainReleaseTrack;
            } else {
              return track;
            }
          }
        }

        return acontextual();
      },
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

      // This is an acontextual reference.
      getMatchableNames: track =>
        (track.referenceByDirectory === 'normally'
          ? [track.name]
          : []),
    },

    trackPrimaryArtwork: {
      [Thing.findThisThingOnly]: false,

      referenceTypes: [
        'track',
        'track-referencing-artworks',
        'track-referenced-artworks',
      ],

      bindTo: 'artworkData',

      include: (artwork) =>
        artwork.isArtwork &&
        artwork.thing.isTrack &&
        artwork === artwork.thing.trackArtworks[0],

      // This is an acontextual reference.
      getMatchableNames: ({thing: track}) =>
        (track.referenceByDirectory === 'normally'
          ? [track.name]
          : []),

      getMatchableDirectories: ({thing: track}) =>
        [track.directory],
    },
  };

  static [Thing.reverseSpecs] = {
    tracksWhichReference: {
      bindTo: 'trackData',

      referencing: track =>
        (track.isMainRelease &&
         track.showInReferenceLists
          ? [track]
          : []),

      referenced: track => track.referencedTracks,
    },

    tracksWhichSample: {
      bindTo: 'trackData',

      referencing: track =>
        (track.isMainRelease &&
         track.showInReferenceLists
          ? [track]
          : []),

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
  };

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

  getOwnMusicVideoCoverPath(musicVideo) {
    if (!this.album) return null;
    if (!musicVideo.unqualifiedDirectory) return null;

    const isSingleFirstTrack =
      this.album.style === 'single' &&
      this.album.tracks[0] === this;

    const trackPrefix =
      (isSingleFirstTrack
        ? ''
        : this.directory + '-');

    return [
      'media.trackCover',
      this.album.directory,
      trackPrefix + musicVideo.unqualifiedDirectory,
      musicVideo.coverArtFileExtension,
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
