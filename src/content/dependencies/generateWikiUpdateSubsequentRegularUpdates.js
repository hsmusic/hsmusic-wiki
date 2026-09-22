import {stitchArrays} from '#sugar';

export default {
  relations: (relation, update) => ({
    links:
      (update.isMainUpdate
        ? update.subsequentRegularUpdates
            .map(update => relation('linkWikiUpdate', update))
        : []),
  }),

  data: (update) => ({
    isLatestMainUpdate:
      update.isLatestMainUpdate,

    dates:
      update.subsequentRegularUpdates
        .map(update => update.date),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('wikiUpdatePage.info.regularUpdates', capsule =>
      html.tags([
        html.tag('p',
          {[html.onlyIfSiblings]: true},

          (data.isLatestMainUpdate
            ? language.$(capsule, 'title.latestMainUpdate')
            : language.$(capsule, 'title'))),

        html.tag('ul', {class: 'regular-update-list'},
          {[html.onlyIfContent]: true},

          stitchArrays({
            link: relations.links,
            date: data.dates,
          }).map(({link, date}) =>
              html.tag('li',
                language.$(capsule, 'item', {
                  date: language.formatDate(date),
                  update: link,
                })))),
      ])),
};
