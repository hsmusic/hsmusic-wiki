import {empty, stitchArrays} from '#sugar';

export default {
  query(supertag) {
    const collections =
      supertag.directDescendantArtTags
        .filter(subtag => subtag.isCollectionArtTag);

    const collectionts =
      supertag.directDescendantArtTags
        .filter(subtag => !subtag.isCollectionArtTag);

    return {collections, collectionts};
  },

  relations: (relation, query, supertag) => ({
    collectionCoverGrids:
      query.collections
        .map(subtag => relation('generateArtTagGalleryPageSubtagCoverGrid', supertag, subtag)),

    noCollectionsCoverGrid:
      (empty(query.collections)
        ? relation('generateArtTagGalleryPageSubtagCoverGrid', null, supertag)
        : null),
  }),

  data: (query, _artTag) => ({
    hasCollections:
      !empty(query.collections),

    collectionNames:
      query.collections
        .map(tag => tag.name),
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('artTagGalleryPage.subtags', capsule =>
      html.tag('div', {id: 'art-tag-subtags-gallery'},
        slots.attributes,
        {[html.onlyIfContent]: true},

        stitchArrays({
          name: data.collectionNames,
          grid: relations.collectionCoverGrids,
        }).map(({name, grid}) =>
            html.tag('section',
              html.tag('h2',
                language.$(capsule, 'collection', {tag: name})),

              grid)),

        !data.hasCollections &&
          html.tag('h2', {[html.onlyIfSiblings]: true},
            language.$(capsule, 'title')),

        relations.noCollectionsCoverGrid)),
};
