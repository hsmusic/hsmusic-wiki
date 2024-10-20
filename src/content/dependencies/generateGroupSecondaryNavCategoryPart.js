import {atOffset} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generateSecondaryNavParentSiblingsPart',
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

  query(sprawl, category, group) {
    const groups = category.groups;
    const index = groups.indexOf(group);

    return {
      previousGroup:
        atOffset(groups, index, -1),

      nextGroup:
        atOffset(groups, index, +1),
    };
  },

  relations: (relation, query, sprawl, category, group) => ({
    parentSiblingsPart:
      relation('generateSecondaryNavParentSiblingsPart'),

    categoryLink:
      (sprawl.groupsByCategoryListing
        ? relation('linkListing', sprawl.groupsByCategoryListing)
        : null),

    colorStyle:
      relation('generateColorStyleAttribute', group.category.color),

    previousGroupLink:
      (query.previousGroup
        ? relation('linkGroupDynamically', query.previousGroup)
        : null),

    nextGroupLink:
      (query.nextGroup
        ? relation('linkGroupDynamically', query.nextGroup)
        : null),
  }),

  data: (_query, _sprawl, category, _group) => ({
    name: category.name,
  }),

  generate: (data, relations, {language}) =>
    relations.parentSiblingsPart.slots({
      colorStyle: relations.colorStyle,
      id: true,

      mainLink:
        (relations.categoryLink
          ? relations.categoryLink.slots({
              content: language.sanitize(data.name),
            })
          : null),

      previousLink: relations.previousGroupLink,
      nextLink: relations.nextGroupLink,

      stringsKey: 'groupPage.secondaryNav.category',
      mainLinkOption: 'category',
    }),
};
