import {empty, filterMultipleArrays, stitchArrays} from '#sugar';

export default {
  sprawl: (wikiData) => ({
    listingTargetSpec: wikiData.listingTargetSpec,
    wikiInfo: wikiData.listingTargetSpec,

    // We need the whole dang wikiData object to process which listings'
    // custom conditions are satisfied, since listings aren't actual Things
    // that bind wikiData for themselves.
    wikiData,
  }),

  query(sprawl) {
    const targets =
      sprawl.listingTargetSpec;

    const targetListings =
      sprawl.listingTargetSpec
        .map(target => target.listings)
        .map(listings => listings
          .filter(listing =>
            (listing.condition
              ? listing.condition(sprawl.wikiData)
              : true)));

    filterMultipleArrays(
      targets,
      targetListings,
      (_target, targetListings) =>
        !empty(targetListings));

    return {targets, targetListings};
  },

  relations: (relation, query) => ({
    listingLinks:
      query.targetListings
        .map(listings => listings
          .map(listing => relation('linkListing', listing))),
  }),

  data: (query, sprawl, currentListing) => ({
    targetStringsKeys:
      query.targets
        .map(({stringsKey}) => stringsKey),

    listingStringsKeys:
      query.targetListings
        .map(listings => listings
          .map(({stringsKey}) => stringsKey)),

    currentTargetIndex:
      (currentListing
        ? query.targets.indexOf(currentListing.target)
        : null),

    currentListingIndex:
      (currentListing
        ? query.targetListings
            .find(listings => listings.includes(currentListing))
            .indexOf(currentListing)
        : null),
  }),

  slots: {
    mode: {validate: v => v.is('content', 'sidebar')},
  },

  generate(data, relations, slots, {html, language}) {
    const listingLinkLists =
      stitchArrays({
        listingLinks: relations.listingLinks,
        listingStringsKeys: data.listingStringsKeys,
      }).map(({listingLinks, listingStringsKeys}, targetIndex) =>
          html.tag('ul',
            stitchArrays({
              listingLink: listingLinks,
              listingStringsKey: listingStringsKeys,
            }).map(({listingLink, listingStringsKey}, listingIndex) =>
                html.tag('li',
                  targetIndex === data.currentTargetIndex &&
                  listingIndex === data.currentListingIndex &&
                    {class: 'current'},

                  listingLink.slots({
                    content:
                      language.$('listingPage', listingStringsKey, 'title.short'),
                  })))));

    const targetTitles =
      data.targetStringsKeys
        .map(stringsKey => language.$('listingPage.target', stringsKey));

    switch (slots.mode) {
      case 'sidebar':
        return html.tags(
          stitchArrays({
            targetTitle: targetTitles,
            listingLinkList: listingLinkLists,
          }).map(({targetTitle, listingLinkList}, targetIndex) =>
              html.tag('details',
                targetIndex === data.currentTargetIndex &&
                  {class: 'current', open: true},

                html.tag('summary',
                  html.tag('span',
                    html.tag('b', targetTitle))),

                listingLinkList)));

      case 'content':
        return (
          html.tag('dl',
            stitchArrays({
              targetTitle: targetTitles,
              listingLinkList: listingLinkLists,
            }).map(({targetTitle, listingLinkList}) => [
                html.tag('dt', {class: 'content-heading'},
                  targetTitle),

                html.tag('dd',
                  listingLinkList),
              ])));
    }
  },
};
