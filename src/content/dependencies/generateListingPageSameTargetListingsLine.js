import {stitchArrays} from '#sugar';

export default {
  relations: (relation, listing) => ({
    listingLinks:
      listing.target.listings
        .map(listing => relation('linkListing', listing)),
  }),

  data: (listing) => ({
    targetStringsKey:
      listing.target.stringsKey,

    listingStringsKeys:
      listing.target.listings.map(listing => listing.stringsKey),

    currentIndex:
      listing.target.listings.indexOf(listing),
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
