// News entry & index page specifications.

export function condition({wikiData}) {
  return wikiData.wikiInfo.enableNews;
}

export function targets({wikiData}) {
  return wikiData.newsData;
}

export function write(entry, {wikiData}) {
  const page = {
    type: 'page',
    path: ['newsEntry', entry.directory],
    page: ({
      generateNavigationLinks,
      html,
      language,
      link,
      transformMultiline,
    }) => ({
      title: language.$('newsEntryPage.title', {entry: entry.name}),

      main: {
        classes: ['long-content'],
        headingMode: 'sticky',

        content: [
          html.tag('p',
            language.$('newsEntryPage.published', {
              date: language.formatDate(entry.date),
            })),

          transformMultiline(entry.content),
        ],
      },

      nav: generateNewsEntryNav(entry, {
        generateNavigationLinks,
        html,
        language,
        link,
        wikiData,
      }),
    }),
  };

  return [page];
}

export function writeTargetless({wikiData}) {
  const {newsData} = wikiData;

  const page = {
    type: 'page',
    path: ['newsIndex'],
    page: ({
      html,
      language,
      link,
      transformMultiline,
    }) => ({
      title: language.$('newsIndex.title'),

      main: {
        classes: ['long-content', 'news-index'],
        headingMode: 'sticky',

        content:
          newsData.map(entry =>
            html.tag('article',
              {id: entry.directory},
              [
                html.tag('h2', [
                  html.tag('time',
                    language.formatDate(entry.date)),
                  link.newsEntry(entry),
                ]),

                transformMultiline(entry.contentShort),

                entry.contentShort !== entry.content &&
                  html.tag('p',
                    link.newsEntry(entry, {
                      text: language.$(
                        'newsIndex.entry.viewRest'
                      ),
                    })),
              ])),
      },

      nav: {simple: true},
    }),
  };

  return [page];
}

function generateNewsEntryNav(entry, {
  generateNavigationLinks,
  html,
  language,
  link,
  wikiData: {newsData},
}) {
  // The newsData list is sorted reverse chronologically (newest ones first),
  // so the way we find next/previous entries is flipped from normal.
  const previousNextLinks = generateNavigationLinks(entry, {
    data: newsData.slice().reverse(),
    linkKey: 'newsEntry',

    html,
    language,
    link,
  });

  return {
    linkContainerClasses: ['nav-links-hierarchy'],
    links: [
      {toHome: true},
      {
        path: ['localized.newsIndex'],
        title: language.$('newsEntryPage.nav.news'),
      },
      {
        html: language.$('newsEntryPage.nav.entry', {
          date: language.formatDate(entry.date),
          entry: link.newsEntry(entry, {class: 'current'}),
        }),
      },
      previousNextLinks && {
        divider: false,
        html: `(${previousNextLinks})`,
      },
    ],
  };
}
