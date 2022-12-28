import Thing from './thing.js';

import find from '../../util/find.js';

export class Group extends Thing {
  static [Thing.referenceType] = 'group';

  static [Thing.getPropertyDescriptors] = ({
    Album,
  }) => ({
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

    featuredAlbums: Thing.common.dynamicThingsFromReferenceList('featuredAlbumsByRef', 'albumData', find.album),

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
        dependencies: ['albumData'],
        compute: ({albumData, [Group.instance]: group}) =>
          albumData?.filter((album) => album.groups.includes(group)) ?? [],
      },
    },

    color: {
      flags: {expose: true},

      expose: {
        dependencies: ['groupCategoryData'],

        compute: ({groupCategoryData, [Group.instance]: group}) =>
          groupCategoryData.find((category) => category.groups.includes(group))
            ?.color,
      },
    },

    category: {
      flags: {expose: true},

      expose: {
        dependencies: ['groupCategoryData'],
        compute: ({groupCategoryData, [Group.instance]: group}) =>
          groupCategoryData.find((category) => category.groups.includes(group)) ??
          null,
      },
    },
  });
}

export class GroupCategory extends Thing {
  static [Thing.getPropertyDescriptors] = ({
    Group,
  }) => ({
    // Update & expose

    name: Thing.common.name('Unnamed Group Category'),
    color: Thing.common.color(),

    groupsByRef: Thing.common.referenceList(Group),

    // Update only

    groupData: Thing.common.wikiData(Group),

    // Expose only

    groups: Thing.common.dynamicThingsFromReferenceList(
      'groupsByRef',
      'groupData',
      find.group
    ),
  });
}
