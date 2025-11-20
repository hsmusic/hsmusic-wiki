export const GROUP_DATA_FILE = 'groups.yaml';

import {inspect} from 'node:util';

import {colors} from '#cli';
import {input} from '#composite';
import Thing from '#thing';
import {is, isBoolean} from '#validators';
import {parseAnnotatedReferences, parseSerieses} from '#yaml';

import {withPropertyFromObject} from '#composite/data';
import {withUniqueReferencingThing} from '#composite/wiki-data';

import {
  exposeConstant,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  annotatedReferenceList,
  color,
  contentString,
  directory,
  flag,
  name,
  referenceList,
  soupyFind,
  soupyReverse,
  thing,
  thingList,
  urls,
} from '#composite/wiki-properties';

export class Group extends Thing {
  static [Thing.referenceType] = 'group';
  static [Thing.wikiData] = 'groupData';

  static [Thing.getPropertyDescriptors] = ({Album, Artist, Series}) => ({
    // Update & expose

    name: name('Unnamed Group'),
    directory: directory(),

    excludeFromGalleryTabs: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withUniqueReferencingThing({
        reverse: soupyReverse.input('groupCategoriesWhichInclude'),
      }).outputs({
        '#uniqueReferencingThing': '#category',
      }),

      withPropertyFromObject({
        object: '#category',
        property: input.value('excludeGroupsFromGalleryTabs'),
      }),

      exposeDependencyOrContinue({
        dependency: '#category.excludeGroupsFromGalleryTabs',
      }),

      exposeConstant({
        value: input.value(false),
      }),
    ],

    divideAlbumsByStyle: flag(false),

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

    serieses: thingList({
      class: input.value(Series),
    }),

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // Expose only

    isGroup: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

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
        dependencies: ['this', 'reverse'],
        compute: ({this: group, reverse}) =>
          reverse.albumsWhoseGroupsInclude(group),
      },
    },

    color: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'reverse'],
        compute: ({this: group, reverse}) =>
          reverse.groupCategoriesWhichInclude(group, {unique: true})
            ?.color,
      },
    },

    category: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'reverse'],
        compute: ({this: group, reverse}) =>
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

      'Exclude From Gallery Tabs': {property: 'excludeFromGalleryTabs'},
      'Divide Albums By Style': {property: 'divideAlbumsByStyle'},

      'Description': {property: 'description'},
      'URLs': {property: 'urls'},

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

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {allInOne},
    thingConstructors: {Group, GroupCategory},
  }) => ({
    title: `Process groups file`,
    file: GROUP_DATA_FILE,

    documentMode: allInOne,
    documentThing: document =>
      ('Category' in document
        ? GroupCategory
        : Group),

    connect(results) {
      let groupCategory;
      let groupRefs = [];

      if (results[0] && !(results[0] instanceof GroupCategory)) {
        throw new Error(`Expected a category at top of group data file`);
      }

      for (const thing of results) {
        if (thing instanceof GroupCategory) {
          if (groupCategory) {
            Object.assign(groupCategory, {groups: groupRefs});
          }

          groupCategory = thing;
          groupRefs = [];
        } else {
          groupRefs.push(Thing.getReference(thing));
        }
      }

      if (groupCategory) {
        Object.assign(groupCategory, {groups: groupRefs});
      }
    },

    // Groups aren't sorted at all, always preserving the order in the data
    // file as-is.
    sort: null,
  });
}

export class GroupCategory extends Thing {
  static [Thing.referenceType] = 'group-category';
  static [Thing.friendlyName] = `Group Category`;
  static [Thing.wikiData] = 'groupCategoryData';

  static [Thing.getPropertyDescriptors] = ({Group}) => ({
    // Update & expose

    name: name('Unnamed Group Category'),
    directory: directory(),

    excludeGroupsFromGalleryTabs: flag(false),

    color: color(),

    groups: referenceList({
      class: input.value(Group),
      find: soupyFind.input('group'),
    }),

    // Update only

    find: soupyFind(),

    // Expose only

    isGroupCategory: [
      exposeConstant({
        value: input.value(true),
      }),
    ],
  });

  static [Thing.reverseSpecs] = {
    groupCategoriesWhichInclude: {
      bindTo: 'groupCategoryData',

      referencing: groupCategory => [groupCategory],
      referenced: groupCategory => groupCategory.groups,
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Category': {property: 'name'},

      'Color': {property: 'color'},

      'Exclude Groups From Gallery Tabs': {
        property: 'excludeGroupsFromGalleryTabs',
      },
    },
  };
}

export class Series extends Thing {
  static [Thing.wikiData] = 'seriesData';

  static [Thing.getPropertyDescriptors] = ({Album, Group}) => ({
    // Update & expose

    name: name('Unnamed Series'),

    showAlbumArtists: {
      flags: {update: true, expose: true},
      update: {
        validate:
          is('all', 'differing', 'none'),
      },
    },

    description: contentString(),

    group: thing({
      class: input.value(Group),
    }),

    albums: referenceList({
      class: input.value(Album),
      find: soupyFind.input('album'),
    }),

    // Update only

    find: soupyFind(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Name': {property: 'name'},

      'Description': {property: 'description'},

      'Show Album Artists': {property: 'showAlbumArtists'},

      'Albums': {property: 'albums'},
    },
  };

  [inspect.custom](depth, options, inspect) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (depth >= 0) showGroup: {
      let group = null;
      try {
        group = this.group;
      } catch {
        break showGroup;
      }

      const groupName = group.name;
      const groupIndex = group.serieses.indexOf(this);

      const num =
        (groupIndex === -1
          ? 'indeterminate position'
          : `#${groupIndex + 1}`);

      parts.push(` (${colors.yellow(num)} in ${colors.green(`"${groupName}"`)})`);
    }

    return parts.join('');
  }
}
