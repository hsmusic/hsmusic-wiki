export const GROUP_DATA_FILE = 'groups.yaml';

import {input} from '#composite';
import Thing from '#thing';
import {parseAnnotatedReferences, parseSerieses} from '#yaml';

import {
  annotatedReferenceList,
  color,
  contentString,
  directory,
  flag,
  name,
  referenceList,
  seriesList,
  soupyFind,
  urls,
  wikiData,
} from '#composite/wiki-properties';

export class Group extends Thing {
  static [Thing.referenceType] = 'group';

  static [Thing.getPropertyDescriptors] = ({Album, Artist}) => ({
    // Update & expose

    name: name('Unnamed Group'),
    directory: directory(),

    description: contentString(),

    urls: urls(),

    closelyLinkedArtists: annotatedReferenceList({
      class: input.value(Artist),
      find: soupyFind.input('artist'),

      date: input.value(null),

      reference: input.value('artist'),
      thing: input.value('artist'),
    }),

    featuredAlbums: referenceList({
      class: input.value(Album),
      find: soupyFind.input('album'),
    }),

    serieses: seriesList({
      group: input.myself(),
    }),

    alwaysReferenceByDirectory: flag(false),

    // Update only

    find: soupyFind(),
    reverse: soupyFind(),

    // Expose only

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

      getMatchableNames: group =>
        (group.alwaysReferenceByDirectory 
          ? [] 
          : [group.name]),
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

      'Always Reference By Directory': {property: 'alwaysReferenceByDirectory'},

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

    save(results) {
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

      const groupData = results.filter(x => x instanceof Group);
      const groupCategoryData = results.filter(x => x instanceof GroupCategory);

      return {groupData, groupCategoryData};
    },

    // Groups aren't sorted at all, always preserving the order in the data
    // file as-is.
    sort: null,
  });
}

export class GroupCategory extends Thing {
  static [Thing.referenceType] = 'group-category';
  static [Thing.friendlyName] = `Group Category`;

  static [Thing.getPropertyDescriptors] = ({Group}) => ({
    // Update & expose

    name: name('Unnamed Group Category'),
    directory: directory(),

    color: color(),

    groups: referenceList({
      class: input.value(Group),
      find: soupyFind.input('group'),
    }),

    // Update only

    find: soupyFind(),
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
    },
  };
}
