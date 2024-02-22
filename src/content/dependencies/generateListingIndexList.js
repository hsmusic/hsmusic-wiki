import {empty, filterMultipleArrays, stitchArrays} from '#sugar';
import {listingTargetOrder} from '#listing-spec';

export default {
  contentDependencies: ['linkListing'],
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({listingData, wikiInfo}) {
    return {listingData, wikiInfo};
  },

  query(sprawl, currentListing) {
    const targets = listingTargetOrder.slice();

    const targetListings =
      targets.map(target =>
        sprawl.listingData.filter(listing =>
          listing.scope === currentListing.scope &&
          listing.target === target &&
          (listing.featureFlag
            ? sprawl.wikiInfo[listing.featureFlag]
            : true)));

    filterMultipleArrays(targets, targetListings,
      (_target, listings) => !empty(listings));

    return {targets, targetListings};
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

    data.targets = query.targets;

    data.listingStringsKeys =
      query.targetListings
        .map(listings =>
          listings.map(({stringsKey}) => stringsKey));

    if (currentListing && currentListing.directory !== 'index') {
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
                  targetIndex === data.currentTargetIndex &&
                  listingIndex === data.currentListingIndex &&
                    {class: 'current'},

                  listingLink.slots({
                    content:
                      language.$(listingStringsKey, 'title.short'),
                  })))));

    const targetTitles =
      data.targets
        .map(target => language.$('listingPage.target', target));

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

                [
                  html.tag('summary',
                    html.tag('span', {class: 'group-name'},
                      targetTitle)),

                  listingLinkList,
                ])));

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
