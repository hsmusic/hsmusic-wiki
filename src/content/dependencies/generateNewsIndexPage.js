import {sortChronologically} from '#sort';
import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generatePageLayout',
    'linkNewsEntry',
    'transformContent',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({newsData}) {
    return {newsData};
  },

  query({newsData}) {
    return {
      entries:
        sortChronologically(
          newsData.slice(),
          {latestFirst: true}),
    };
  },

  relations(relation, query) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.entryLinks =
      query.entries
        .map(entry => relation('linkNewsEntry', entry));

    relations.viewRestLinks =
      query.entries
        .map(entry =>
          (entry.content === entry.contentShort
            ? null
            : relation('linkNewsEntry', entry)));

    relations.entryContents =
      query.entries
        .map(entry => relation('transformContent', entry.contentShort));

    return relations;
  },

  data(query) {
    return {
      entryDates:
        query.entries.map(entry => entry.date),

      entryDirectories:
        query.entries.map(entry => entry.directory),
    };
  },

  generate: (data, relations, {html, language}) =>
    language.encapsulate('newsIndex', pageCapsule =>
      relations.layout.slots({
        title: language.$(pageCapsule, 'title'),
        headingMode: 'sticky',

        mainClasses: ['long-content', 'news-index'],
        mainContent:
          stitchArrays({
            entryLink: relations.entryLinks,
            viewRestLink: relations.viewRestLinks,
            content: relations.entryContents,
            date: data.entryDates,
            directory: data.entryDirectories,
          }).map(({entryLink, viewRestLink, content, date, directory}) =>
              language.encapsulate(pageCapsule, 'entry', entryCapsule =>
                html.tag('article', {id: directory}, [
                  html.tag('h2', [
                    html.tag('time', language.formatDate(date)),
                    entryLink,
                  ]),

                  content,

                  viewRestLink
                    ?.slot('content', language.$(entryCapsule, 'viewRest')),
                ]))),

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {auto: 'current'},
        ],
      })),
};
