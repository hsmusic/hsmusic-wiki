import {stitchArrays} from '#sugar';

export default {
  sprawl: (wikiData) => ({wikiData}),

  query: (sprawl, listing) => ({
    listings:
      listing.target.listings
        .filter(listing =>
          (listing.condition
            ? listing.condition(sprawl.wikiData)
            : true)),
  }),

  relations: (relation, query, _sprawl, _listing) => ({
    listingLinks:
      query.listings
        .map(listing => relation('linkListing', listing)),
  }),

  data: (query, _sprawl, listing) => ({
    targetStringsKey:
      listing.target.stringsKey,

    listingStringsKeys:
      query.listings.map(listing => listing.stringsKey),

    currentIndex:
      query.listings.indexOf(listing),
  }),

  generate: (data, relations, {html, language}) =>
    html.tag('p',
      {[html.onlyIfContent]: true},

      language.$('listingPage.listingsFor', {
        [language.onlyIfOptions]: ['listings'],

        target:
          language.$('listingPage.target', data.targetStringsKey),

        listings:
          language.formatUnitList(
            stitchArrays({
              link: relations.listingLinks,
              stringsKey: data.listingStringsKeys,
            }).map(({link, stringsKey}, index) =>
                html.tag('span',
                  index === data.currentIndex &&
                    {class: 'current'},

                  link.slots({
                    attributes: {class: 'nowrap'},
                    content: language.$('listingPage', stringsKey, 'title.short'),
                  })))),
      })),
};
