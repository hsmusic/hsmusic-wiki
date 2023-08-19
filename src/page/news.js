export const description = `per-entry news pages & index`;

export function condition({wikiData}) {
  return wikiData.wikiInfo.enableNews;
}

export function targets({wikiData}) {
  return wikiData.newsData;
}

export function pathsForTarget(newsEntry) {
  return [
    {
      type: 'page',
      path: ['newsEntry', newsEntry.directory],
      contentFunction: {
        name: 'generateNewsEntryPage',
        args: [newsEntry],
      },
    },
  ];
}

export function pathsTargetless() {
  return [
    {
      type: 'page',
      path: ['newsIndex'],
      contentFunction: {name: 'generateNewsIndexPage'},
    },
  ];
}
