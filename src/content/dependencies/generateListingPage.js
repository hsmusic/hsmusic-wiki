export default {
  contentDependencies: ['generatePageLayout', 'linkListingIndex'],
  extraDependencies: ['html'],

  relations(relation) {
    return {
      layout: relation('generatePageLayout'),
      listingsIndexLink: relation('linkListingIndex'),
    };
  },

  slots: {
    title: {type: 'string'},

    type: {
      validate: v => v.is('rows'),
    },

    rows: {
      validate: v => v.arrayOf(v.isHTML),
    },
  },

  generate(relations, slots, {html}) {
    return relations.layout.slots({
      title: slots.title,
      headingMode: 'sticky',

      mainContent: [
        slots.type === 'rows' &&
          html.tag('ul',
            slots.rows
              .map(row => html.tag('li', row))),
      ],

      navLinkStyle: 'hierarchical',
      navLinks: [
        {auto: 'home'},
        {html: relations.listingsIndexLink},
        {auto: 'current'},
      ],
    });
  },
};
