export default {
  contentDependencies: ['transformContent'],
  extraDependencies: ['html', 'language'],

  relations: (relation, thing) =>
    ({description:
        (thing.descriptionShort || thing.description
          ? relation('transformContent',
              thing.descriptionShort ?? thing.description)
          : null)}),

  data: (thing) =>
    ({hasLongerDescription:
        thing.description &&
        thing.descriptionShort &&
        thing.descriptionShort !== thing.description}),

  slots: {
    infoPageLink: {
      type: 'html',
      mutable: true,
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    html.tag('p', {class: 'quick-info'},
      {[html.joinChildren]: html.tag('br')},
      {[html.onlyIfContent]: true},

      [
        relations.description?.slot('mode', 'inline'),

        data.hasLongerDescription &&
        slots.infoPageLink &&
          language.$('misc.quickDescription.moreInfo', {
            link:
              slots.infoPageLink
                .slot('content', language.$('misc.quickDescription.moreInfo.link')),
          }),
      ]),
};
