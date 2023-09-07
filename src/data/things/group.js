import find from '#find';

import Thing, {
  color,
  directory,
  name,
  referenceList,
  resolvedReferenceList,
  simpleString,
  urls,
  wikiData,
} from './thing.js';

export class Group extends Thing {
  static [Thing.referenceType] = 'group';

  static [Thing.getPropertyDescriptors] = ({Album}) => ({
    // Update & expose

    name: name('Unnamed Group'),
    directory: directory(),

    description: simpleString(),

    urls: urls(),

    featuredAlbumsByRef: referenceList(Album),

    // Update only

    albumData: wikiData(Album),
    groupCategoryData: wikiData(GroupCategory),

    // Expose only

    featuredAlbums: resolvedReferenceList({
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

    name: name('Unnamed Group Category'),
    color: color(),

    groupsByRef: referenceList(Group),

    // Update only

    groupData: wikiData(Group),

    // Expose only

    groups: resolvedReferenceList({
      list: 'groupsByRef',
      data: 'groupData',
      find: find.group,
    }),
  });
}
