// Static content page specification. (These are static pages coded into the
// wiki data folder, used for a variety of purposes, e.g. wiki info,
// changelog, and so on.)

export const description = `static wiki-wide content pages specified in data`;

export function targets({wikiData}) {
  return wikiData.staticPageData;
}

export function write(staticPage) {
  const page = {
    type: 'page',
    path: ['staticPage', staticPage.directory],
    page: ({
      transformMultiline,
    }) => ({
      title: staticPage.name,
      stylesheet: staticPage.stylesheet,

      main: {
        classes: ['long-content'],
        headingMode: 'sticky',

        content: transformMultiline(staticPage.content),
      },

      nav: {simple: true},
    }),
  };

  return [page];
}
