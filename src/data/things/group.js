import {input} from '#composite';
import find from '#find';

import {
  color,
  contentString,
  directory,
  name,
  referenceList,
  urls,
  wikiData,
} from '#composite/wiki-properties';

import Thing from './thing.js';

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
        compute: ({description}) => description.split('<hr class="split">')[0],
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

  static [Thing.yamlDocumentSpec] = {
    propertyFieldMapping: {
      name: 'Group',
      directory: 'Directory',
      description: 'Description',
      urls: 'URLs',

      featuredAlbums: 'Featured Albums',
    },

    ignoredFields: ['Review Points'],
  };
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
    propertyFieldMapping: {
      name: 'Category',
      color: 'Color',
    },
  };
}
