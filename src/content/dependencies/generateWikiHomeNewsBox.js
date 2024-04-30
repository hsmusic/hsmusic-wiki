import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generatePageSidebarBox',
    'linkNewsEntry',
    'transformContent',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({newsData}) => ({
    entries:
      newsData.slice(0, 3),
  }),

  relations: (relation, sprawl) => ({
    box:
      relation('generatePageSidebarBox'),

    entryContents:
      sprawl.entries
        .map(entry => relation('transformContent', entry.contentShort)),

    entryMainLinks:
      sprawl.entries
        .map(entry => relation('linkNewsEntry', entry)),

    entryReadMoreLinks:
      sprawl.entries
        .map(entry =>
          entry.contentShort !== entry.content &&
            relation('linkNewsEntry', entry)),
  }),

  data: (sprawl) => ({
    entryDates:
      sprawl.entries
        .map(entry => entry.date),
  }),

  generate(data, relations, {html, language}) {
    if (empty(relations.entryContents)) {
      return html.blank();
    }

    return relations.box.slots({
      attributes: {class: 'latest-news-sidebar-box'},
      collapsible: false,

      content: [
        html.tag('h1', language.$('homepage.news.title')),

        stitchArrays({
          date: data.entryDates,
          content: relations.entryContents,
          mainLink: relations.entryMainLinks,
          readMoreLink: relations.entryReadMoreLinks,
        }).map(({
            date,
            content,
            mainLink,
            readMoreLink,
          }, index) =>
            html.tag('article', {class: 'news-entry'},
              index === 0 &&
                {class: 'first-news-entry'},

              [
                html.tag('h2', [
                  html.tag('time', language.formatDate(date)),
                  mainLink,
                ]),

                content.slot('thumb', 'medium'),

                html.tag('p',
                  {[html.onlyIfContent]: true},
                  readMoreLink
                    ?.slots({
                      content: language.$('homepage.news.entry.viewRest'),
                    })),
              ])),
      ],
    });
  },
};
