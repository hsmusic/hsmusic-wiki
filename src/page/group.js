import {empty} from '#sugar';

export const description = `per-group info & album gallery pages`;

export function targets({wikiData}) {
  return wikiData.groupData;
}

export function pathsForTarget(group) {
  return [
    {
      type: 'page',
      path: ['groupInfo', group.directory],

      contentFunction: {
        name: 'generateGroupInfoPage',
        args: [group],
      },
    },

    {
      type: 'page',
      path: ['groupGallery', group.directory],

      condition: () =>
        !empty(group.albums),

      contentFunction: {
        name: 'generateGroupGalleryPage',
        args: [group],
      },
    },
  ];
}

export function pathsTargetless({wikiData: {wikiInfo}}) {
  return [
    {
      type: 'redirect',
      fromPath: ['page', 'albums/fandom'],
      toPath: ['groupGallery', 'fandom'],
      title: 'Fandom - Gallery',

      condition: () =>
        wikiInfo.canonicalBase === 'https://hsmusic.wiki/',
    },

    {
      type: 'redirect',
      fromPath: ['page', 'albums/official'],
      toPath: ['groupGallery', 'official'],
      title: 'Official - Gallery',

      condition: () =>
        wikiInfo.canonicalBase === 'https://hsmusic.wiki/',
    },
  ];
}
