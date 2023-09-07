import find from '#find';

import Thing, {
  color,
  directory,
  name,
  referenceList,
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

    featuredAlbums: referenceList({
      class: Album,
      find: find.album,
      data: 'albumData',
    }),

    // Update only

    albumData: wikiData(Album),
    groupCategoryData: wikiData(GroupCategory),

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
}

export class GroupCategory extends Thing {
  static [Thing.getPropertyDescriptors] = ({Group}) => ({
    // Update & expose

    name: name('Unnamed Group Category'),
    color: color(),

    groups: referenceList({
      class: Group,
      find: find.group,
      data: 'groupData',
    }),

    // Update only

    groupData: wikiData(Group),
  });
}
