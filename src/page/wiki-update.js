import {empty} from '#sugar';

export const description = `per-wiki-update changelog pages`;

export function condition({wikiData}) {
  return !empty(wikiData.wikiUpdateData);
}

export function targets({wikiData}) {
  return wikiData.wikiUpdateData;
}

export function pathsForTarget(update) {
  return [
    {
      type: 'page',
      path: ['wikiUpdate', update.directory],

      contentFunction: {
        name: 'generateWikiUpdatePage',
        args: [update],
      },
    },
  ];
}

export function pathsTargetless() {
  return [
    {
      type: 'page',
      path: ['wikiUpdateIndex'],
      contentFunction: {name: 'generateWikiUpdateIndexPage'},
    },
  ];
}
