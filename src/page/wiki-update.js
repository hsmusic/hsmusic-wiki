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

    ...update.sections.map(section => ({
      type: 'page',
      path: ['wikiUpdateSection', update.directory, section.hash],

      contentFunction: {
        name: 'generateWikiUpdateSectionPage',
        args: [section],
      },
    }))
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
