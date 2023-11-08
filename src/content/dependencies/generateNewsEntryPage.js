import {sortChronologically} from '#wiki-data';

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
        relations.previousEntryNavLink =
          relation('linkNewsEntry', query.previousEntry);

        relations.previousEntryContentLink =
          relation('linkNewsEntry', query.previousEntry);
      }

      if (query.nextEntry) {
        relations.nextEntryNavLink =
          relation('linkNewsEntry', query.nextEntry);

        relations.nextEntryContentLink =
          relation('linkNewsEntry', query.nextEntry);
      }
    }

    return relations;
  },

  data(query, sprawl, newsEntry) {
    return {
      name: newsEntry.name,
      date: newsEntry.date,

      daysSincePreviousEntry:
        query.previousEntry &&
          Math.round((newsEntry.date - query.previousEntry.date) / 86400000),

      daysUntilNextEntry:
        query.nextEntry &&
          Math.round((query.nextEntry.date - newsEntry.date) / 86400000),

      previousEntryDate:
        query.previousEntry?.date,

      nextEntryDate:
        query.nextEntry?.date,
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

        html.tag('p', {
          [html.onlyIfContent]: true,
          [html.joinChildren]: html.tag('br'),
          class: 'read-another-links',
        }, [
          relations.previousEntryContentLink &&
            language.$('newsEntryPage.readAnother.previous', {
              entry: relations.previousEntryContentLink,

              date:
                html.tag('span',
                  {
                    title:
                      language.$('newsEntryPage.readAnother.earlier', {
                        time:
                          language.countDays(data.daysSincePreviousEntry, {unit: true}),
                      }).toString(),
                  },
                  language.formatDate(data.previousEntryDate)),
            }),

          relations.nextEntryContentLink &&
            language.$('newsEntryPage.readAnother.next', {
              entry: relations.nextEntryContentLink,

              date:
                html.tag('span',
                  {
                    title:
                      language.$('newsEntryPage.readAnother.later', {
                        time:
                          language.countDays(data.daysUntilNextEntry, {unit: true}),
                      }).toString(),
                  },
                  language.formatDate(data.nextEntryDate)),
            }),
        ]),
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
                  previousLink: relations.previousEntryNavLink ?? null,
                  nextLink: relations.nextEntryNavLink ?? null,
                }).content)})`
              : null),
        },
      ],
    });
  },
};
