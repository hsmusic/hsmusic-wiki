export default {
  contentDependencies: ['transformContent'],
  extraDependencies: ['html', 'language'],

  query: (thing) => ({
    hasDescription:
      !!thing.description,

    hasLongerDescription:
      thing.description &&
      thing.descriptionShort &&
      thing.descriptionShort !== thing.description,
  }),

  relations: (relation, query, thing) => ({
    description:
      (query.hasLongerDescription || !thing.description
        ? null
        : relation('transformContent', thing.description)),

    descriptionShort:
      (query.hasLongerDescription
        ? relation('transformContent', thing.descriptionShort)
        : null),

    descriptionLong:
      (query.hasLongerDescription
        ? relation('transformContent', thing.description)
        : null),
  }),

  data: (query) => ({
    hasDescription: query.hasDescription,
    hasLongerDescription: query.hasLongerDescription,
  }),

  slots: {
    extraReadingLinks: {
      validate: v => v.sparseArrayOf(v.isHTML),
    },
  },

  generate(data, relations, slots, {html, language}) {
    const prefix = 'misc.quickDescription';

    const actionsWithoutLongerDescription =
      (data.hasLongerDescription
        ? null
     : slots.extraReadingLinks
        ? language.$(prefix, 'readMore', {
            links:
              language.formatDisjunctionList(slots.extraReadingLinks),
          })
        : null);

    const wrapExpandCollapseLink = (expandCollapse, content) =>
      html.tag('a', {class: `${expandCollapse}-link`},
        {href: '#'},
        content);

    const actionsWhenCollapsed =
      (!data.hasLongerDescription
        ? null
     : slots.extraReadingLinks
        ? language.$(prefix, 'expandDescription.orReadMore', {
            links:
              language.formatDisjunctionList(slots.extraReadingLinks),
            expand:
              wrapExpandCollapseLink('expand',
                language.$(prefix, 'expandDescription.orReadMore.expand')),
          })
        : language.$(prefix, 'expandDescription', {
            expand:
              wrapExpandCollapseLink('expand',
                language.$(prefix, 'expandDescription.expand')),
          }));

    const actionsWhenExpanded =
      (!data.hasLongerDescription
        ? null
      : slots.extraReadingLinks
        ? language.$(prefix, 'collapseDescription.orReadMore', {
            links:
              language.formatDisjunctionList(slots.extraReadingLinks),
            collapse:
              wrapExpandCollapseLink('collapse',
                language.$(prefix, 'collapseDescription.orReadMore.collapse')),
          })
        : language.$(prefix, 'collapseDescription', {
            collapse:
              wrapExpandCollapseLink('collapse',
                language.$(prefix, 'collapseDescription.collapse')),
          }));

    const wrapActions = (classes, children) =>
      html.tag('p', {class: 'quick-description-actions'},
        {[html.onlyIfContent]: true},
        {class: classes},
        children);

    const wrapContent = (classes, content) =>
      html.tag('div',
        {[html.onlyIfContent]: true},
        {class: classes},
        content?.slot('mode', 'multiline'));

    return (
      html.tag('div', {
        [html.onlyIfContent]: true,
        class: [
          'quick-description',

          data.hasLongerDescription &&
            'collapsed',

          !data.hasLongerDescription &&
          !slots.extraReadingLinks &&
            'has-content-only',

          !data.hasDescription &&
          slots.extraReadingLinks &&
            'has-external-links-only',
        ],
      }, [
        wrapContent(['description-content'], relations.description),
        wrapContent(['description-content', 'short'], relations.descriptionShort),
        wrapContent(['description-content', 'long'], relations.descriptionLong),

        wrapActions([], actionsWithoutLongerDescription),
        wrapActions(['when-collapsed'], actionsWhenCollapsed),
        wrapActions(['when-expanded'], actionsWhenExpanded),
      ]));
  }
};
