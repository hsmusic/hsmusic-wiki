import {atOffset} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generatePreviousNextLinks',
    'generateSecondaryNav',
    'linkGroupDynamically',
    'linkListing',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({listingData, wikiInfo}) => ({
    groupsByCategoryListing:
      (wikiInfo.enableListings
        ? listingData.find(listing =>
            listing.scope === 'wiki' &&
            listing.directory === 'groups/by-category')
        : null),
  }),

  query(sprawl, group) {
    const groups = group.category.groups;
    const index = groups.indexOf(group);

    return {
      previousGroup:
        atOffset(groups, index, -1),

      nextGroup:
        atOffset(groups, index, +1),
    };
  },

  relations(relation, query, sprawl, group) {
    const relations = {};

    relations.secondaryNav =
      relation('generateSecondaryNav');

    if (sprawl.groupsByCategoryListing) {
      relations.categoryLink =
        relation('linkListing', sprawl.groupsByCategoryListing);
    }

    relations.colorStyle =
      relation('generateColorStyleAttribute', group.category.color);

    if (query.previousGroup || query.nextGroup) {
      relations.previousNextLinks =
        relation('generatePreviousNextLinks');
    }

    relations.previousGroupLink =
      (query.previousGroup
        ? relation('linkGroupDynamically', query.previousGroup)
        : null);

    relations.nextGroupLink =
      (query.nextGroup
        ? relation('linkGroupDynamically', query.nextGroup)
        : null);

    return relations;
  },

  data: (query, sprawl, group) => ({
    categoryName: group.category.name,
  }),

  generate(data, relations, {html, language}) {
    const previousNextPart =
      (relations.previousNextLinks
        ? relations.previousNextLinks
            .slots({
              previousLink: relations.previousGroupLink,
              nextLink: relations.nextGroupLink,
              id: true,
            })
            .content /* TODO: Kludge. */
        : null);

    const {categoryLink} = relations;

    categoryLink?.setSlot('content', data.categoryName);

    return relations.secondaryNav.slots({
      class: 'nav-links-groups',
      content:
        (previousNextPart
          ? html.tag('span', {class: 'nav-link'},
              relations.colorStyle.slot('context', 'primary-only'),

              [
                categoryLink?.slot('color', false),
                `(${language.formatUnitList(previousNextPart)})`,
              ])
       : categoryLink
          ? html.tag('span', {class: 'nav-link'},
              categoryLink)
          : html.blank()),
    });
  },
};
