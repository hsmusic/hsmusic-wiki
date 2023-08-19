import {empty} from '#sugar';

export const description = `per-group info & album gallery pages`;

export function targets({wikiData}) {
  return wikiData.groupData;
}

export function pathsForTarget(group) {
  const hasGalleryPage = !empty(group.albums);

  return [
    {
      type: 'page',
      path: ['groupInfo', group.directory],

      contentFunction: {
        name: 'generateGroupInfoPage',
        args: [group],
      },
    },

    hasGalleryPage && {
      type: 'page',
      path: ['groupGallery', group.directory],

      contentFunction: {
        name: 'generateGroupGalleryPage',
        args: [group],
      },
    },
  ];
}

export function pathsTargetless({wikiData: {wikiInfo}}) {
  return [
    wikiInfo.canonicalBase === 'https://hsmusic.wiki/' &&
      {
        type: 'redirect',
        fromPath: ['page', 'albums/fandom'],
        toPath: ['groupGallery', 'fandom'],
        title: 'Fandom - Gallery',
      },

    wikiInfo.canonicalBase === 'https://hsmusic.wiki/' &&
      {
        type: 'redirect',
        fromPath: ['page', 'albums/official'],
        toPath: ['groupGallery', 'official'],
        title: 'Official - Gallery',
      },
  ];
}
