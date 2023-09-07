import find from '#find';

import Thing from './thing.js';

export class Group extends Thing {
  static [Thing.referenceType] = 'group';

  static [Thing.getPropertyDescriptors] = ({Album}) => ({
    // Update & expose

    name: Thing.common.name('Unnamed Group'),
    directory: Thing.common.directory(),

    description: Thing.common.simpleString(),

    urls: Thing.common.urls(),

    featuredAlbumsByRef: Thing.common.referenceList(Album),

    // Update only

    albumData: Thing.common.wikiData(Album),
    groupCategoryData: Thing.common.wikiData(GroupCategory),

    // Expose only

    featuredAlbums: Thing.common.resolvedReferenceList({
      list: 'featuredAlbumsByRef',
      data: 'albumData',
      find: find.album,
    }),

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
}

export class GroupCategory extends Thing {
  static [Thing.getPropertyDescriptors] = ({Group}) => ({
    // Update & expose

    name: Thing.common.name('Unnamed Group Category'),
    color: Thing.common.color(),

    groupsByRef: Thing.common.referenceList(Group),

    // Update only

    groupData: Thing.common.wikiData(Group),

    // Expose only

    groups: Thing.common.resolvedReferenceList({
      list: 'groupsByRef',
      data: 'groupData',
      find: find.group,
    }),
  });
}
