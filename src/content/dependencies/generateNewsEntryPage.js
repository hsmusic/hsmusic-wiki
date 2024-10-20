import {sortChronologically} from '#sort';
import {atOffset} from '#sugar';

export default {
  contentDependencies: [
    'generateNewsEntryNavAccent',
    'generateNewsEntryReadAnotherLinks',
    'generatePageLayout',
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

  relations: (relation, query, sprawl, newsEntry) => ({
    layout:
      relation('generatePageLayout'),

    content:
      relation('transformContent', newsEntry.content),

    newsIndexLink:
      relation('linkNewsIndex'),

    readAnotherLinks:
      relation('generateNewsEntryReadAnotherLinks',
        newsEntry,
        query.previousEntry,
        query.nextEntry),

    navAccent:
      relation('generateNewsEntryNavAccent',
        query.previousEntry,
        query.nextEntry),
  }),

  data: (query, sprawl, newsEntry) => ({
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
  }),

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
            accent: relations.navAccent,
          },
        ],
      })),
};
