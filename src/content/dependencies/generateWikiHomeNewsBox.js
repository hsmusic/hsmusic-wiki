import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: ['linkNewsEntry', 'transformContent'],
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({newsData}) {
    return {
      entries: newsData.slice(0, 3),
    };
  },

  relations(relation, sprawl) {
    return {
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
    };
  },

  data(sprawl) {
    return {
      entryDates:
        sprawl.entries
          .map(entry => entry.date),
    }
  },

  generate(data, relations, {html, language}) {
    if (empty(relations.entryContents)) {
      return html.blank();
    }

    return {
      class: 'latest-news-sidebar-box',
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
    };
  },
};
