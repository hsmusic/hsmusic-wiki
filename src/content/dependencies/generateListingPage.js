import {empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generatePageLayout',
    'linkListing',
    'linkListingIndex',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({listingSpec}) {
    return {listingSpec};
  },

  query(sprawl, listing) {
    return {
      seeAlso:
        (listing.seeAlso
          ? listing.seeAlso.map(directory =>
              sprawl.listingSpec
                .find(listing => listing.directory === directory))
          : null),
    };
  },

  relations(relation, query) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.listingsIndexLink =
      relation('linkListingIndex');

    if (!empty(query.seeAlso)) {
      // TODO: Invalid listing directories filtered here aren't warned about anywhere.
      // Honestly we shouldn't be searching listingSpec here at all - listings should
      // be implemented as proper things which search listingSpec themselves, and
      // expose seeAlso as a list of listing objects rather than by reference.
      relations.seeAlsoLinks =
        query.seeAlso
          .map(listing => relation('linkListing', listing))
          .filter(Boolean);
    }

    return relations;
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

  generate(data, relations, slots, {html, language}) {
    return relations.layout.slots({
      title: language.$(`listingPage.${data.stringsKey}.title`),
      headingMode: 'sticky',

      mainContent: [
        relations.seeAlsoLinks &&
          html.tag('p',
            language.$('listingPage.seeAlso', {
              listings: language.formatUnitList(relations.seeAlsoLinks),
            })),

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
