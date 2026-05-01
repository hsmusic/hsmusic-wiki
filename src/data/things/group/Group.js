import {input, V} from '#composite';
import Thing from '#thing';
import {isBoolean} from '#validators';
import {parseAnnotatedReferences, parseSerieses, parseURLs} from '#yaml';

import {withPropertyFromObject} from '#composite/data';
import {withUniqueReferencingThing} from '#composite/wiki-data';

import {
  exposeConstant,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  annotatedReferenceList,
  contentString,
  directory,
  flag,
  name,
  referenceList,
  soupyFind,
  soupyReverse,
  thingList,
  urls,
} from '#composite/wiki-properties';

export class Group extends Thing {
  static [Thing.referenceType] = 'group';
  static [Thing.wikiData] = 'groupData';

  static [Thing.getPropertyDescriptors] = ({Album, Artist, Series}) => ({
    // Update & expose

    name: name(V('Unnamed Group')),
    directory: directory(),

    useForDividingReferenceLists: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromObject('category', V('useGroupsForDividingReferenceLists')),
      exposeDependencyOrContinue('#category.useGroupsForDividingReferenceLists'),

      exposeConstant(V(false)),
    ],

    excludeFromGalleryTabs: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromObject('category', V('excludeGroupsFromGalleryTabs')),
      exposeDependencyOrContinue('#category.excludeGroupsFromGalleryTabs'),

      exposeConstant(V(false)),
    ],

    divideAlbumsByStyle: flag(V(false)),

    description: contentString(),

    urls: urls(),

    closelyLinkedArtists: annotatedReferenceList({
      class: input.value(Artist),
      find: soupyFind.input('artist'),

      reference: input.value('artist'),
      thing: input.value('artist'),
    }),

    featuredAlbums: referenceList({
      class: input.value(Album),
      find: soupyFind.input('album'),
    }),

    serieses: thingList(V(Series)),

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // Expose only

    isGroup: exposeConstant(V(true)),

    descriptionShort: {
      flags: {expose: true},

      expose: {
        dependencies: ['description'],
        compute: ({description}) =>
          (description
            ? description.split('<hr class="split">')[0]
            : null),
      },
    },

    albums: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', '_reverse'],
        compute: ({this: group, _reverse: reverse}) =>
          reverse.albumsWhoseGroupsInclude(group),
      },
    },

    color: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', '_reverse'],
        compute: ({this: group, _reverse: reverse}) =>
          reverse.groupCategoriesWhichInclude(group, {unique: true})
            ?.color,
      },
    },

    category: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', '_reverse'],
        compute: ({this: group, _reverse: reverse}) =>
          reverse.groupCategoriesWhichInclude(group, {unique: true}) ??
          null,
      },
    },
  });

  static [Thing.findSpecs] = {
    group: {
      referenceTypes: ['group', 'group-gallery'],
      bindTo: 'groupData',
    },
  };

  static [Thing.reverseSpecs] = {
    groupsCloselyLinkedTo: {
      bindTo: 'groupData',

      referencing: group =>
        group.closelyLinkedArtists
          .map(({artist, ...referenceDetails}) => ({
            group,
            artist,
            referenceDetails,
          })),

      referenced: ({artist}) => [artist],

      tidy: ({group, referenceDetails}) =>
        ({group, ...referenceDetails}),
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Group': {property: 'name'},
      'Directory': {property: 'directory'},

      'Use For Dividing Reference Lists': {
        property: 'useForDividingReferenceLists',
      },

      'Exclude From Gallery Tabs': {
        property: 'excludeFromGalleryTabs',
      },

      'Divide Albums By Style': {
        property: 'divideAlbumsByStyle',
      },

      'Description': {property: 'description'},
      'URLs': {property: 'urls', transform: parseURLs},

      'Closely Linked Artists': {
        property: 'closelyLinkedArtists',
        transform: value =>
          parseAnnotatedReferences(value, {
            referenceField: 'Artist',
            referenceProperty: 'artist',
          }),
      },

      'Featured Albums': {property: 'featuredAlbums'},

      'Series': {
        property: 'serieses',
        transform: parseSerieses,
      },

      'Review Points': {ignore: true},
    },
  };
}
