export default {
  contentDependencies: ['generatePageSidebarBox', 'linkGroup'],
  extraDependencies: ['html', 'language'],

  relations: (relation, album) => ({
    box:
      relation('generatePageSidebarBox'),

    groupLinks:
      album.groups
        .map(group => relation('linkGroup', group)),
  }),

  generate: (relations, {html, language}) =>
    relations.box.slots({
      content:
        html.tag('p',
          language.$('albumSidebar.groupBox.trackGroupsDiffer', {
            groups:
              html.metatag('blockwrap',
                language.formatConjunctionList(relations.groupLinks)),
          })),
    }),
};
