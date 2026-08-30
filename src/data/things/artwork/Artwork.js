import {inspect} from 'node:util';

import {input, V} from '#composite';
import find from '#find';
import Thing from '#thing';

import {
  isContentString,
  isContributionList,
  isDate,
  isDimensions,
  isFileExtension,
  optional,
  validateArrayItems,
  validateProperties,
  validateReference,
  validateReferenceList,
} from '#validators';

import {
  parseAnnotatedReferences,
  parseContributors,
  parseDate,
  parseDimensions,
} from '#yaml';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
  exposeWhetherDependencyAvailable,
  flipFilter,
} from '#composite/control-flow';

import {
  withFilteredList,
  withNearbyItemFromList,
  withPropertyFromList,
  withPropertyFromObject,
} from '#composite/data';

import {
  constituteFrom,
  constituteOrContinue,
  withRecontextualizedContributionList,
  withResolvedAnnotatedReferenceList,
  withResolvedContribs,
  withResolvedReferenceList,
} from '#composite/wiki-data';

import {
  contentString,
  directory,
  flag,
  reverseReferenceList,
  simpleString,
  soupyFind,
  soupyReverse,
  thing,
  wikiData,
} from '#composite/wiki-properties';

import {
  inheritContributionListFromMainArtwork,
  inheritFromMainArtwork,
  withContainingArtworkList,
} from '#composite/things/artwork';

export class Artwork extends Thing {
  static [Thing.referenceType] = 'artwork';
  static [Thing.wikiData] = 'artworkData';

  static [Thing.constitutibleProperties] = [
    // Contributions currently aren't being observed for constitution.
    // 'artistContribs', // from attached artwork or thing
  ];

  static [Thing.getPropertyDescriptors] = ({
    ArtTag,
    ArtworkArtistContribution,
  }) => ({
    // Update & expose

    unqualifiedDirectory: directory({
      name: input.value(null),
    }),

    thing: thing(),
    thingProperty: simpleString(),

    // Implemented in subclasses of Artwork.
    mainArtwork: exposeConstant(V(null)),

    // Not inherited from main artwork, as unqualifiedDirectory isn't either,
    // since it's an identifying property of this artwork (it is part of how
    // the artwork is referenced).
    label: simpleString(),

    source: [
      inheritFromMainArtwork(),
      contentString(),
    ],

    originDetails: [
      inheritFromMainArtwork(),
      contentString(),
    ],

    fileNotes: [
      inheritFromMainArtwork(),
      contentString(),
    ],

    showFilename: [
      inheritFromMainArtwork(),
      simpleString(),
    ],

    dateFromThingProperty: simpleString(),

    // Date is not inherited from the main artwork.
    date: [
      exposeUpdateValueOrContinue({
        validate: input.value(isDate),
      }),

      constituteFrom('thing', 'dateFromThingProperty'),
    ],

    fileExtensionFromThingProperty: simpleString(),

    fileExtension: [
      inheritFromMainArtwork(),

      exposeUpdateValueOrContinue({
        validate: input.value(isFileExtension),
      }),

      constituteFrom('thing', 'fileExtensionFromThingProperty', {
        else: input.value('jpg'),
      }),
    ],

    dimensionsFromThingProperty: simpleString(),

    dimensions: [
      inheritFromMainArtwork(),

      exposeUpdateValueOrContinue({
        validate: input.value(isDimensions),
      }),

      constituteFrom('thing', 'dimensionsFromThingProperty'),
    ],

    attachAbove: [
      inheritFromMainArtwork(),
      flag(V(false)),
    ],

    artistContribsFromThingProperty: simpleString(),
    artistContribsArtistProperty: simpleString(),

    artistContribs: [
      inheritContributionListFromMainArtwork(),

      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),

        // XXX: All artwork artist contributions, as resolved from update value
        // (*not* those constituted from thing), are generic artwork contribs.
        // The class should be specified by whatever the artwork is placed on!!
        class: input.value(ArtworkArtistContribution),

        date: 'date',
        thingProperty: input.thisProperty(),
        artistProperty: 'artistContribsArtistProperty',
      }),

      exposeDependencyOrContinue('#resolvedContribs', V('empty')),

      withPropertyFromObject('attachedArtwork', V('artistContribs')),

      withRecontextualizedContributionList('#attachedArtwork.artistContribs'),
      exposeDependencyOrContinue('#attachedArtwork.artistContribs'),

      exitWithoutDependency('artistContribsFromThingProperty', V([])),

      withPropertyFromObject('thing', 'artistContribsFromThingProperty')
        .outputs({'#value': '#artistContribsFromThing'}),

      withRecontextualizedContributionList('#artistContribsFromThing'),
      exposeDependency('#artistContribsFromThing'),
    ],

    style: [
      inheritFromMainArtwork(),
      simpleString(),
    ],

    artTagsFromThingProperty: simpleString(),

    artTags: [
      inheritFromMainArtwork(),

      withResolvedReferenceList({
        list: input.updateValue({
          validate:
            validateReferenceList(ArtTag[Thing.referenceType]),
        }),
        find: soupyFind.input('artTag'),
      }),

      exposeDependencyOrContinue('#resolvedReferenceList', V('empty')),

      constituteOrContinue('attachedArtwork', V('artTags'), V('empty')),

      constituteFrom('thing', 'artTagsFromThingProperty', V([])),
    ],

    referencedArtworksFromThingProperty: simpleString(),

    referencedArtworks: [
      inheritFromMainArtwork(),

      {
        compute: (continuation) => continuation({
          ['#find']:
            find.mixed({
              track: find.trackPrimaryArtwork,
              album: find.albumPrimaryArtwork,
            }),
        }),
      },

      withResolvedAnnotatedReferenceList({
        list: input.updateValue({
          validate:
            // TODO: It's annoying to hardcode this when it's really the
            // same behavior as through annotatedReferenceList and through
            // referenceListUpdateDescription, the latter of which isn't
            // available outside of #composite/wiki-data internals.
            validateArrayItems(
              validateProperties({
                reference: validateReference(['album', 'track']),
                annotation: optional(isContentString),
              })),
        }),

        data: '_artworkData',
        find: '#find',

        thing: input.value('artwork'),
      }),

      exposeDependencyOrContinue('#resolvedAnnotatedReferenceList', V('empty')),

      constituteFrom('thing', 'referencedArtworksFromThingProperty', {
        else: input.value([]),
      }),
    ],

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // used for referencedArtworks (mixedFind)
    artworkData: wikiData(V(Artwork)),

    // Expose only

    isArtwork: exposeConstant(V(true)),

    referencedByArtworks: reverseReferenceList({
      reverse: soupyReverse.input('artworksWhichReference'),
    }),

    isPrimaryArtwork: [
      withContainingArtworkList(),
      exitWithoutDependency('#containingArtworkList'),

      {
        dependencies: [input.myself(), '#containingArtworkList'],
        compute: ({
          [input.myself()]: myself,
          ['#containingArtworkList']: list,
        }) =>
          list[0] === myself,
      },
    ],

    isSecondaryArtwork: [
      withContainingArtworkList(),
      exitWithoutDependency('#containingArtworkList'),

      {
        dependencies: [input.myself(), '#containingArtworkList'],
        compute: ({
          [input.myself()]: myself,
          ['#containingArtworkList']: list,
        }) =>
          list[0] !== myself,
      },
    ],

    primaryArtwork: [
      withContainingArtworkList(),
      exitWithoutDependency('#containingArtworkList'),

      {
        dependencies: ['#containingArtworkList'],
        compute: ({'#containingArtworkList': list}) =>
          list[0],
      },
    ],

    isReusedArtwork:
      exposeWhetherDependencyAvailable('mainArtwork'),

    attachedArtwork: [
      exitWithoutDependency('attachAbove', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      withContainingArtworkList(),

      withPropertyFromList('#containingArtworkList', V('attachAbove')),

      flipFilter('#containingArtworkList.attachAbove')
        .outputs({'#containingArtworkList.attachAbove': '#filterNotAttached'}),

      withNearbyItemFromList({
        list: '#containingArtworkList',
        item: input.myself(),
        offset: input.value(-1),
        filter: '#filterNotAttached',
      }),

      exposeDependency('#nearbyItem'),
    ],

    attachingArtworks: reverseReferenceList({
      reverse: soupyReverse.input('artworksWhichAttach'),
    }),

    groups: [
      withPropertyFromObject('thing', V('groups')),
      exposeDependencyOrContinue('#thing.groups'),

      exposeConstant(V([])),
    ],

    contentWarningArtTags: [
      withPropertyFromList('artTags', V('isContentWarning')),
      withFilteredList('artTags', '#artTags.isContentWarning'),
      exposeDependency('#filteredList'),
    ],

    contentWarnings: [
      withPropertyFromList('contentWarningArtTags', V('name')),
      exposeDependency('#contentWarningArtTags.name'),
    ],

  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Directory': {property: 'unqualifiedDirectory'},
      'File Extension': {property: 'fileExtension'},

      'Dimensions': {
        property: 'dimensions',
        transform: parseDimensions,
      },

      'Label': {property: 'label'},
      'Source': {property: 'source'},
      'Origin Details': {property: 'originDetails'},
      'File Notes': {property: 'fileNotes'},
      'Show Filename': {property: 'showFilename'},

      'Date': {
        property: 'date',
        transform: parseDate,
      },

      'Attach Above': {property: 'attachAbove'},

      'Artists': {
        property: 'artistContribs',
        transform: parseContributors,
      },

      'Style': {property: 'style'},

      'Tags': {property: 'artTags'},

      'Referenced Artworks': {
        property: 'referencedArtworks',
        transform: parseAnnotatedReferences,
      },
    },
  };

  static [Thing.reverseSpecs] = {
    artworksWhichReference: {
      bindTo: 'artworkData',

      referencing: referencingArtwork =>
        referencingArtwork.referencedArtworks
          .map(({artwork: referencedArtwork, ...referenceDetails}) => ({
            referencingArtwork,
            referencedArtwork,
            referenceDetails,
          })),

      referenced: ({referencedArtwork}) => [referencedArtwork],

      tidy: ({referencingArtwork, referenceDetails}) => ({
        artwork: referencingArtwork,
        ...referenceDetails,
      }),

      date: ({artwork}) => artwork.date,
    },

    artworksWhichAttach: {
      bindTo: 'artworkData',

      referencing: referencingArtwork =>
        (referencingArtwork.attachAbove
          ? [referencingArtwork]
          : []),

      referenced: referencingArtwork =>
        [referencingArtwork.attachedArtwork],
    },

    artworksWhichFeature: {
      bindTo: 'artworkData',

      include: artwork =>
        !artwork.isReusedArtwork,

      referencing: artwork => [artwork],
      referenced: artwork => artwork.artTags,
    },
  };

  get path() {
    if (this.mainArtwork) {
      return this.mainArtwork.path;
    }

    if (!this.thing) return null;
    if (!this.thing.getOwnArtworkPath) return null;

    return this.thing.getOwnArtworkPath(this);
  }

  countOwnContributionInContributionTotals(contrib) {
    if (this.attachAbove) {
      return false;
    }

    if (contrib.annotation?.startsWith('edits for wiki')) {
      return false;
    }

    if (this.isReusedArtwork) {
      return false;
    }

    return true;
  }

  [inspect.custom](depth, options, inspect) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (this.thing) {
      if (depth >= 0) {
        const newOptions = {
          ...options,
          depth:
            (options.depth === null
              ? null
              : options.depth - 1),
        };

        parts.push(` for ${inspect(this.thing, newOptions)}`);
      } else {
        parts.push(` for ${Thing.inspectReference(this.thing)}`);
      }
    }

    return parts.join('');
  }
}
