import {empty, unique} from '#sugar';

export default {
  query: (_descendant, ancestor) => ({
    allDescendantsHaveMoreDescendants:
      ancestor.directDescendantArtTags
        .every(descendant => !empty(descendant.directDescendantArtTags)),
  }),

  relations: (relation, query, descendant, _ancestor) => ({
    infoLink:
      relation('linkArtTagInfo', descendant),

    galleryLink:
      (query.allDescendantsHaveMoreDescendants
        ? null
        : relation('linkArtTagGallery', descendant)),
  }),

  data: (_query, descendant, _ancestor) => ({
    timesFeaturedTotal:
      unique([
        ...descendant.directlyFeaturedInArtworks,
        ...descendant.indirectlyFeaturedInArtworks,
      ]).length
  }),

  generate: (data, relations, {html, language}) =>
    html.tag('li',
      language.encapsulate('artTagInfoPage.descendantTags.item', itemCapsule =>
        language.encapsulate(itemCapsule, workingCapsule => {
          const workingOptions = {};

          workingOptions.tag = relations.infoLink;

          if (!html.isBlank(relations.galleryLink ?? html.blank())) {
            workingCapsule += '.withGallery';
            workingOptions.gallery =
              relations.galleryLink.slot('content',
                language.$(itemCapsule, 'withGallery.gallery'));
          }

          if (data.timesFeaturedTotal >= 1) {
            workingCapsule += `.withTimesUsed`;
            workingOptions.timesUsed =
              language.countTimesFeatured(data.timesFeaturedTotal, {
                unit: true,
              });
          }

          return language.$(workingCapsule, workingOptions);
        }))),
};
