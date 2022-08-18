/** @format */

// Static content page specification. (These are static pages coded into the
// wiki data folder, used for a variety of purposes, e.g. wiki info,
// changelog, and so on.)

export function targets({wikiData}) {
  return wikiData.staticPageData;
}

export function write(staticPage) {
  const page = {
    type: 'page',
    path: ['staticPage', staticPage.directory],
    page: ({html, transformMultiline}) => ({
      title: staticPage.name,
      stylesheet: staticPage.stylesheet,

      main: {
        content: html.tag('div', {class: 'long-content'}, [
          html.tag('h1', staticPage.name),
          transformMultiline(staticPage.content),
        ]),
      },

      nav: {simple: true},
    }),
  };

  return [page];
}
