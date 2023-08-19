export const description = `static wiki-wide content pages specified in data`;

// Static pages are written in the wiki's data folder and contain content and
// basic page metadata. They're used for a variety of purposes, such as an
// "about" page, a changelog, links to places beyond the wiki, and so on.
export function targets({wikiData}) {
  return wikiData.staticPageData;
}

export function pathsForTarget(staticPage) {
  return [
    {
      type: 'page',
      path: ['staticPage', staticPage.directory],

      contentFunction: {
        name: 'generateStaticPage',
        args: [staticPage],
      },
    },
  ];
}
