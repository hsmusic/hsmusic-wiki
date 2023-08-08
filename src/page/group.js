// Group page specifications.

import {
  empty,
} from '../util/sugar.js';

import {
  getTotalDuration,
  sortChronologically,
} from '../util/wiki-data.js';

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
      },

    wikiInfo.canonicalBase === 'https://hsmusic.wiki/' &&
      {
        type: 'redirect',
        fromPath: ['page', 'albums/official'],
        toPath: ['groupGallery', 'official'],
      },
  ];
}
