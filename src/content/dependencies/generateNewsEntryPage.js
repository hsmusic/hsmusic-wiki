import {sortChronologically} from '../../util/wiki-data.js';

export default {
  contentDependencies: [
    'generatePageLayout',
    'generatePreviousNextLinks',
    'linkNewsEntry',
    'linkNewsIndex',
    'transformContent',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({newsData}) {
    return {newsData};
  },

  query({newsData}, newsEntry) {
    const entries = sortChronologically(newsData.slice());

    const index = entries.indexOf(newsEntry);

    const previousEntry =
      (index > 0
        ? entries[index - 1]
        : null);

    const nextEntry =
      (index < entries.length - 1
        ? entries[index + 1]
        : null);

    return {previousEntry, nextEntry};
  },

  relations(relation, query, sprawl, newsEntry) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.content =
      relation('transformContent', newsEntry.content);

    relations.newsIndexLink =
      relation('linkNewsIndex');

    relations.currentEntryLink =
      relation('linkNewsEntry', newsEntry);

    if (query.previousEntry || query.nextEntry) {
      relations.previousNextLinks =
        relation('generatePreviousNextLinks');

      if (query.previousEntry) {
        relations.previousEntryLink =
          relation('linkNewsEntry', query.previousEntry);
      }

      if (query.nextEntry) {
        relations.nextEntryLink =
          relation('linkNewsEntry', query.nextEntry);
      }
    }

    return relations;
  },

  data(query, sprawl, newsEntry) {
    return {
      name: newsEntry.name,
      date: newsEntry.date,
    };
  },

  generate(data, relations, {html, language}) {
    return relations.layout.slots({
      title:
        language.$('newsEntryPage.title', {
          entry: data.name,
        }),

      headingMode: 'sticky',

      mainClasses: ['long-content'],
      mainContent: [
        html.tag('p',
          language.$('newsEntryPage.published', {
            date: language.formatDate(data.date),
          })),

        relations.content,
      ],

      navLinkStyle: 'hierarchical',
      navLinks: [
        {auto: 'home'},
        {html: relations.newsIndexLink},
        {
          auto: 'current',
          accent:
            (relations.previousNextLinks
              ? `(${language.formatUnitList(relations.previousNextLinks.slots({
                  previousLink: relations.previousEntryLink ?? null,
                  nextLink: relations.nextEntryLink ?? null,
                }).content)})`
              : null),
        },
      ],
    });
  },
};
