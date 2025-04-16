import {inspect} from 'node:util';

import {input} from '#composite';
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

import {withIndexInList, withPropertyFromObject} from '#composite/data';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  withRecontextualizedContributionList,
  withResolvedAnnotatedReferenceList,
  withResolvedContribs,
  withResolvedReferenceList,
} from '#composite/wiki-data';

import {
  contentString,
  directory,
  reverseReferenceList,
  simpleString,
  soupyFind,
  soupyReverse,
  thing,
  wikiData,
} from '#composite/wiki-properties';

import {withContainingArtworkList, withDate} from '#composite/things/artwork';

export class Artwork extends Thing {
  static [Thing.referenceType] = 'artwork';

  static [Thing.getPropertyDescriptors] = ({
    ArtTag,
    Contribution,
  }) => ({
    // Update & expose

    unqualifiedDirectory: directory({
      name: input.value(null),
    }),

    thing: thing(),
    thingProperty: simpleString(),

    label: simpleString(),
    source: contentString(),

    dateFromThingProperty: simpleString(),

    date: [
      withDate({
        from: input.updateValue({validate: isDate}),
      }),

      exposeDependency({dependency: '#date'}),
    ],

    fileExtensionFromThingProperty: simpleString(),

    fileExtension: [
      {
        compute: (continuation) => continuation({
          ['#default']: 'jpg',
        }),
      },

      exposeUpdateValueOrContinue({
        validate: input.value(isFileExtension),
      }),

      exitWithoutDependency({
        dependency: 'thing',
        value: '#default',
      }),

      exitWithoutDependency({
        dependency: 'fileExtensionFromThingProperty',
        value: '#default',
      }),

      withPropertyFromObject({
        object: 'thing',
        property: 'fileExtensionFromThingProperty',
      }),

      exposeDependencyOrContinue({
        dependency: '#value',
      }),

      exposeDependency({
        dependency: '#default',
      }),
    ],

    dimensionsFromThingProperty: simpleString(),

    dimensions: [
      exposeUpdateValueOrContinue({
        validate: input.value(isDimensions),
      }),

      exitWithoutDependency({
        dependency: 'artistContribsFromThingProperty',
        value: input.value(null),
      }),

      withPropertyFromObject({
        object: 'thing',
        property: 'dimensionsFromThingProperty',
      }).outputs({
        ['#value']: '#dimensionsFromThing',
      }),

      exitWithoutDependency({
        dependency: 'dimensionsFromThingProperty',
        value: input.value(null),
      }),

      exposeDependencyOrContinue({
        dependency: '#dimensionsFromThing',
      }),

      exposeConstant({
        value: input.value(null),
      }),
    ],

    artistContribsFromThingProperty: simpleString(),
    artistContribsArtistProperty: simpleString(),

    artistContribs: [
      withDate(),

      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
        date: '#date',
        artistProperty: 'artistContribsArtistProperty',
      }),

      exposeDependencyOrContinue({
        dependency: '#resolvedContribs',
        mode: input.value('empty'),
      }),

      exitWithoutDependency({
        dependency: 'artistContribsFromThingProperty',
        value: input.value([]),
      }),

      withPropertyFromObject({
        object: 'thing',
        property: 'artistContribsFromThingProperty',
      }).outputs({
        ['#value']: '#artistContribs',
      }),

      withRecontextualizedContributionList({
        list: '#artistContribs',
      }),

      exposeDependency({
        dependency: '#artistContribs',
      }),
    ],

    artTagsFromThingProperty: simpleString(),

    artTags: [
      withResolvedReferenceList({
        list: input.updateValue({
          validate:
            validateReferenceList(ArtTag[Thing.referenceType]),
        }),

        find: soupyFind.input('artTag'),
      }),

      exposeDependencyOrContinue({
        dependency: '#resolvedReferenceList',
        mode: input.value('empty'),
      }),

      exitWithoutDependency({
        dependency: 'artTagsFromThingProperty',
        value: input.value([]),
      }),

      withPropertyFromObject({
        object: 'thing',
        property: 'artTagsFromThingProperty',
      }).outputs({
        ['#value']: '#artTags',
      }),

      exposeDependencyOrContinue({
        dependency: '#artTags',
      }),

      exposeConstant({
        value: input.value([]),
      }),
    ],

    referencedArtworksFromThingProperty: simpleString(),

    referencedArtworks: [
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

        data: 'artworkData',
        find: '#find',

        thing: input.value('artwork'),
      }),

      exposeDependencyOrContinue({
        dependency: '#resolvedAnnotatedReferenceList',
        mode: input.value('empty'),
      }),

      exitWithoutDependency({
        dependency: 'referencedArtworksFromThingProperty',
        value: input.value([]),
      }),

      withPropertyFromObject({
        object: 'thing',
        property: 'referencedArtworksFromThingProperty',
      }).outputs({
        ['#value']: '#referencedArtworks',
      }),

      exposeDependencyOrContinue({
        dependency: '#referencedArtworks',
      }),

      exposeConstant({
        value: input.value([]),
      }),
    ],

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // used for referencedArtworks (mixedFind)
    artworkData: wikiData({
      class: input.value(Artwork),
    }),

    // Expose only

    referencedByArtworks: reverseReferenceList({
      reverse: soupyReverse.input('artworksWhichReference'),
    }),

    isMainArtwork: [
      withContainingArtworkList(),

      exitWithoutDependency({
        dependency: '#containingArtworkList',
        value: input.value(null),
      }),

      {
        dependencies: [input.myself(), '#containingArtworkList'],
        compute: ({
          [input.myself()]: myself,
          ['#containingArtworkList']: list,
        }) =>
          list[0] === myself,
      },
    ],

    mainArtwork: [
      withContainingArtworkList(),

      exitWithoutDependency({
        dependency: '#containingArtworkList',
        value: input.value(null),
      }),

      {
        dependencies: ['#containingArtworkList'],
        compute: ({'#containingArtworkList': list}) =>
          list[0],
      },
    ],

    siblingArtworks: [
      withContainingArtworkList(),

      exitWithoutDependency({
        dependency: '#containingArtworkList',
        value: input.value(null),
      }),

      withIndexInList({
        list: '#containingArtworkList',
        item: input.myself(),
      }),

      exitWithoutDependency({
        dependency: '#index',
        mode: input.value('index'),
        value: input.value(null),
      }),

      {
        dependencies: ['#containingArtworkList', '#index'],
        compute: ({
          ['#containingArtworkList']: list,
          ['#index']: index,
        }) => [
          ...list.slice(0, index),
          ...list.slice(index + 1),
        ],
      },
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

      'Date': {
        property: 'date',
        transform: parseDate,
      },

      'Artists': {
        property: 'artistContribs',
        transform: parseContributors,
      },

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

    artworksWhichFeature: {
      bindTo: 'artworkData',

      referencing: artwork => [artwork],
      referenced: artwork => artwork.artTags,
    },
  };

  get path() {
    if (!this.thing) return null;
    if (!this.thing.getOwnArtworkPath) return null;

    return this.thing.getOwnArtworkPath(this);
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
        parts.push(` for ${colors.blue(Thing.getReference(this.thing))}`);
      }
    }

    return parts.join('');
  }
}
