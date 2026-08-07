import {empty, unique} from '#sugar';

export default {
  query: (_descendant, ancestor) => ({
    allDescendantsHaveMoreDescendants:
      ancestor.directDescendantArtTags
        .every(descendant => !empty(descendant.directDescendantArtTags)),
  }),

  relations: (relation, _query, descendant, _ancestor) => ({
    infoLink:
      relation('linkArtTagInfo', descendant),

    galleryLink:
      relation('linkArtTagGallery', descendant),
  }),

  data: (query, descendant, _ancestor) => ({
    allDescendantsHaveMoreDescendants:
      query.allDescendantsHaveMoreDescendants,

    timesFeaturedTotal:
      unique([
        ...descendant.directlyFeaturedInArtworks,
        ...descendant.indirectlyFeaturedInArtworks,
      ]).length
  }),

  slots: {
    showTimesFeatured: {
      type: 'boolean',
      default: true,
    },

    showGalleryLink: {
      validate: v => v.is(true, false, 'auto'),
      default: 'auto',
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    html.tag('li',
      language.encapsulate('artTagInfoPage.descendantTags.item', itemCapsule =>
        language.encapsulate(itemCapsule, workingCapsule => {
          const workingOptions = {};

          workingOptions.tag = relations.infoLink;

          const showGalleryLink =
            (slots.showGalleryLink === true
              ? true
           : slots.showGalleryLink === 'auto'
              ? !data.allDescendantsHaveMoreDescendants
              : false);

          if (showGalleryLink) {
            workingCapsule += '.withGallery';
            workingOptions.gallery =
              relations.galleryLink.slot('content',
                language.$(itemCapsule, 'withGallery.gallery'));
          }

          if (slots.showTimesFeatured && data.timesFeaturedTotal >= 1) {
            workingCapsule += `.withTimesUsed`;
            workingOptions.timesUsed =
              language.countTimesFeatured(data.timesFeaturedTotal, {
                unit: true,
              });
          }

          return language.$(workingCapsule, workingOptions);
        }))),
};
