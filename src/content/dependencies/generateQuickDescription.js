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

  generate(data, relations, {html, language}) {
    const prefix = 'misc.quickDescription';

    const wrapExpandCollapseLink = (expandCollapse, content) =>
      html.tag('a', {class: `${expandCollapse}-link`},
        {href: '#'},
        content);

    const actionsWhenCollapsed =
      (data.hasLongerDescription
        ? language.$(prefix, 'expandDescription', {
            expand:
              wrapExpandCollapseLink('expand',
                language.$(prefix, 'expandDescription.expand')),
          })
        : null);

    const actionsWhenExpanded =
      (data.hasLongerDescription
        ? language.$(prefix, 'collapseDescription', {
            collapse:
              wrapExpandCollapseLink('collapse',
                language.$(prefix, 'collapseDescription.collapse')),
          })
        : null);

    const wrapActions = (attributes, children) =>
      html.tag('p', {class: 'quick-description-actions'},
        {[html.onlyIfContent]: true},
        attributes,

        children);

    const wrapContent = (attributes, content) =>
      html.tag('div', {class: 'description-content'},
        {[html.onlyIfContent]: true},
        attributes,

        content?.slot('mode', 'multiline'));

    return (
      html.tag('div', {class: 'quick-description'},
        {[html.onlyIfContent]: true},

        data.hasLongerDescription &&
          {class: 'collapsed'},

        [
          wrapContent(null, relations.description),
          wrapContent({class: 'short'}, relations.descriptionShort),
          wrapContent({class: 'long'}, relations.descriptionLong),

          wrapActions({class: 'when-collapsed'}, actionsWhenCollapsed),
          wrapActions({class: 'when-expanded'}, actionsWhenExpanded),
        ]));
  }
};
