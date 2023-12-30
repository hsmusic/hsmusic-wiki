export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generatePreviousNextLinks',
    'generateSecondaryNav',
    'linkGroupDynamically',
    'linkListing',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({listingSpec, wikiInfo}) => ({
    groupsByCategoryListing:
      (wikiInfo.enableListings
        ? listingSpec
            .find(l => l.directory === 'groups/by-category')
        : null),
  }),

  query(sprawl, group) {
    const groups = group.category.groups;
    const index = groups.indexOf(group);

    return {
      previousGroup:
        (index > 0
          ? groups[index - 1]
          : null),

      nextGroup:
        (index < groups.length - 1
          ? groups[index + 1]
          : null),
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
    const {content: previousNextPart} =
      relations.previousNextLinks.slots({
        previousLink: relations.previousGroupLink,
        nextLink: relations.nextGroupLink,
        id: true,
      });

    const {categoryLink} = relations;

    categoryLink?.setSlot('content', data.categoryName);

    return relations.secondaryNav.slots({
      class: 'nav-links-groups',
      content:
        (!relations.previousGroupLink && !relations.nextGroupLink
          ? categoryLink
          : html.tag('span',
              relations.colorStyle,

              [
                categoryLink.slot('color', false),
                `(${language.formatUnitList(previousNextPart)})`,
              ])),
    });
  },
};
