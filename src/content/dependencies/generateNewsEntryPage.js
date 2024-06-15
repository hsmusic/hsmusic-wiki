import {sortChronologically} from '#sort';
import {atOffset} from '#sugar';

export default {
  contentDependencies: [
    'generateNewsEntryReadAnotherLinks',
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
      atOffset(entries, index, -1);

    const nextEntry =
      atOffset(entries, index, +1);

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

      relations.readAnotherLinks =
        relation('generateNewsEntryReadAnotherLinks',
          newsEntry,
          query.previousEntry,
          query.nextEntry);

      if (query.previousEntry) {
        relations.previousEntryNavLink =
          relation('linkNewsEntry', query.previousEntry);
      }

      if (query.nextEntry) {
        relations.nextEntryNavLink =
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

  generate: (data, relations, {html, language}) =>
    language.encapsulate('newsEntryPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            entry: data.name,
          }),

        headingMode: 'sticky',

        mainClasses: ['long-content'],
        mainContent: [
          html.tag('p',
            language.$(pageCapsule, 'published', {
              date: language.formatDate(data.date),
            })),

          relations.content,
          relations.readAnotherLinks,
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
      })),
};
