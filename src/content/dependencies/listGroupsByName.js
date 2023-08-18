import {stitchArrays} from '#sugar';
import {sortAlphabetically} from '#wiki-data';

export default {
  contentDependencies: ['generateListingPage', 'linkGroup', 'linkGroupGallery'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({groupData}) {
    return {groupData};
  },

  query({groupData}, spec) {
    return {
      spec,

      groups: sortAlphabetically(groupData.slice()),
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      infoLinks:
        query.groups
          .map(group => relation('linkGroup', group)),

      galleryLinks:
        query.groups
          .map(group => relation('linkGroupGallery', group)),
    };
  },

  generate(relations, {language}) {
    return relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          infoLink: relations.infoLinks,
          galleryLink: relations.galleryLinks,
        }).map(({infoLink, galleryLink}) => ({
            group: infoLink,
            gallery:
              galleryLink
                .slot('content', language.$('listingPage.listGroups.byName.item.gallery')),
          })),
    });
  },
};
