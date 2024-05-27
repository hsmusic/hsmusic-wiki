export default {
  extraDependencies: ['defaultLanguage', 'html', 'wikiData'],

  sprawl: ({wikiInfo}) => ({wikiInfo}),

  data: (sprawl) => ({
    shortWikiName:
      sprawl.wikiInfo.nameShort,
  }),

  generate: (data, {defaultLanguage, html}) =>
    html.tags([
      `<?xml version="1.0" encoding="UTF-8"?>`,
      html.tag('OpenSearchDescription',
        {xmlns: 'http://a9.com/-/spec/opensearch/1.1/'},
        [
          html.tag('ShortName', data.shortWikiName),

          html.tag('Description',
            defaultLanguage.$('misc.search.openSearchDescription', {
              wiki: data.shortWikiName,
            })),

          html.tag('InputEncoding', 'UTF-8'),

          html.tag('Url', {
            type: 'text/html',
            method: 'GET',
            template: 'https://hsmusic.wiki/search/#search={searchTerms}',
          }),
        ]),
    ]),
};
