export default {
  contentDependencies: ['generatePageLayout', 'linkListingIndex'],
  extraDependencies: ['html'],

  relations(relation) {
    return {
      layout: relation('generatePageLayout'),
      listingsIndexLink: relation('linkListingIndex'),
    };
  },

  data(query, sprawl, listing) {
    return {
      stringsKey: listing.stringsKey,
    };
  },

  slots: {
    type: {
      validate: v => v.is('rows'),
    },

    rows: {
      validate: v => v.arrayOf(v.isObject),
    },
  },

  generate(data, relations, slots, {html}) {
    return relations.layout.slots({
      title: language.$(`listingPage.${data.stringsKey}.title`),
      headingMode: 'sticky',

      mainContent: [
        slots.type === 'rows' &&
          html.tag('ul',
            slots.rows.map(row =>
              html.tag('li',
                language.$(`listingPage.${data.stringsKey}.item`, row)))),
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
