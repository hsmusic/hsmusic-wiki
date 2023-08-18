import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateListingPage', 'linkGroup', 'linkGroupGallery'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({groupCategoryData}) {
    return {groupCategoryData};
  },

  query({groupCategoryData}, spec) {
    return {
      spec,
      groupCategories: groupCategoryData,
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      categoryLinks:
        query.groupCategories
          .map(category => relation('linkGroup', category.groups[0])),

      infoLinks:
        query.groupCategories
          .map(category =>
            category.groups
              .map(group => relation('linkGroup', group))),

      galleryLinks:
        query.groupCategories
          .map(category =>
            category.groups
              .map(group => relation('linkGroupGallery', group)))
    };
  },

  data(query) {
    return {
      categoryNames:
        query.groupCategories
          .map(category => category.name),
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'chunks',

      chunkTitles:
        stitchArrays({
          link: relations.categoryLinks,
          name: data.categoryNames,
        }).map(({link, name}) => ({
            category: link.slot('content', name),
          })),

      chunkRows:
        stitchArrays({
          infoLinks: relations.infoLinks,
          galleryLinks: relations.galleryLinks,
        }).map(({infoLinks, galleryLinks}) =>
            stitchArrays({
              infoLink: infoLinks,
              galleryLink: galleryLinks,
            }).map(({infoLink, galleryLink}) => ({
                group: infoLink,
                gallery:
                  galleryLink
                    .slot('content', language.$('listingPage.listGroups.byCategory.chunk.item.gallery')),
              }))),
    });
  },
};
