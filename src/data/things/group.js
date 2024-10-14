export const GROUP_DATA_FILE = 'groups.yaml';

import {input} from '#composite';
import find from '#find';
import Thing from '#thing';
import {parseSerieses} from '#yaml';

import {
  color,
  contentString,
  directory,
  name,
  referenceList,
  seriesList,
  urls,
  wikiData,
} from '#composite/wiki-properties';

export class Group extends Thing {
  static [Thing.referenceType] = 'group';

  static [Thing.getPropertyDescriptors] = ({Album}) => ({
    // Update & expose

    name: name('Unnamed Group'),
    directory: directory(),

    description: contentString(),

    urls: urls(),

    featuredAlbums: referenceList({
      class: input.value(Album),
      find: input.value(find.album),
      data: 'albumData',
    }),

    serieses: seriesList(),

    // Update only

    albumData: wikiData({
      class: input.value(Album),
    }),

    groupCategoryData: wikiData({
      class: input.value(GroupCategory),
    }),

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
        dependencies: ['this', 'albumData'],
        compute: ({this: group, albumData}) =>
          albumData?.filter((album) => album.groups.includes(group)) ?? [],
      },
    },

    color: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'groupCategoryData'],
        compute: ({this: group, groupCategoryData}) =>
          groupCategoryData.find((category) => category.groups.includes(group))
            ?.color,
      },
    },

    category: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'groupCategoryData'],
        compute: ({this: group, groupCategoryData}) =>
          groupCategoryData.find((category) => category.groups.includes(group)) ??
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

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Group': {property: 'name'},
      'Directory': {property: 'directory'},
      'Description': {property: 'description'},
      'URLs': {property: 'urls'},

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
      find: input.value(find.group),
      data: 'groupData',
    }),

    // Update only

    groupData: wikiData({
      class: input.value(Group),
    }),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Category': {property: 'name'},
      'Color': {property: 'color'},
    },
  };
}
