import {empty, stitchArrays} from '../../util/sugar.js';

export default {
  contentDependencies: ['linkListing'],
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({listingTargetSpec, wikiInfo}) {
    return {listingTargetSpec, wikiInfo};
  },

  query(sprawl) {
    const query = {};

    const targetListings =
      sprawl.listingTargetSpec
        .map(({listings}) =>
          listings
            .filter(listing =>
              !listing.featureFlag ||
              sprawl.wikiInfo[listing.featureFlag]));

    query.targets =
      sprawl.listingTargetSpec
        .filter((target, index) => !empty(targetListings[index]));

    query.targetListings =
      targetListings
        .filter(listings => !empty(listings))

    return query;
  },

  relations(relation, query) {
    return {
      listingLinks:
        query.targetListings
          .map(listings =>
            listings.map(listing => relation('linkListing', listing))),
    };
  },

  data(query, sprawl, currentListing) {
    const data = {};

    data.targetStringsKeys =
      query.targets
        .map(({stringsKey}) => stringsKey);

    data.listingStringsKeys =
      query.targetListings
        .map(listings =>
          listings.map(({stringsKey}) => stringsKey));

    if (currentListing) {
      data.currentTargetIndex =
        query.targets
          .indexOf(currentListing.target);

      data.currentListingIndex =
        query.targetListings
          .find(listings => listings.includes(currentListing))
          .indexOf(currentListing);
    }

    return data;
  },

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
                  {class:
                    targetIndex === data.currentTargetIndex &&
                    listingIndex === data.currentListingIndex &&
                      'current'},
                  listingLink
                    .slot('content', language.$(`listingPage.${listingStringsKey}.title.short`))))));

    const targetTitles =
      data.targetStringsKeys
        .map(stringsKey => language.$(`listingPage.target.${stringsKey}`));

    switch (slots.mode) {
      case 'sidebar':
        return html.tags(
          stitchArrays({
            targetTitle: targetTitles,
            listingLinkList: listingLinkLists,
          }).map(({targetTitle, listingLinkList}, targetIndex) =>
              html.tag('details',
                {
                  open: targetIndex === data.currentTargetIndex,
                  class: targetIndex === data.currentTargetIndex && 'current',
                },
                [
                  html.tag('summary',
                    html.tag('span', {class: 'group-name'}, targetTitle)),

                  listingLinkList,
                ])));

      case 'content':
        return (
          html.tag('dl',
            stitchArrays({
              targetTitle: targetTitles,
              listingLinkList: listingLinkLists,
            }).map(({targetTitle, listingLinkList}) => [
                html.tag('dt', {class: ['content-heading']}, targetTitle),
                html.tag('dd', listingLinkList),
              ])));
    }
  },
};
