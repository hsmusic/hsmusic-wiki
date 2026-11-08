import {sortArtworksChronologically} from '#sort';
import {stitchArrays, unique} from '#sugar';

export default {
  query(artTag) {
    const directArtworks = artTag.directlyFeaturedInArtworks;
    const indirectArtworks = artTag.indirectlyFeaturedInArtworks;
    const allArtworks = unique([...directArtworks, ...indirectArtworks]);

    sortArtworksChronologically(allArtworks, {latestFirst: true});

    return {directArtworks, indirectArtworks, allArtworks};
  },

  relations: (relation, query, artTag) => ({
    featuredLine:
      relation('generateArtTagGalleryPageFeaturedLine'),

    showingLine:
      relation('generateArtTagGalleryPageShowingLine'),

    coverGrid:
      relation('generateCoverGrid'),

    coverGridItems:
      artTag.featuredInArtworks
        .map(artwork => relation('generateCoverGridItem', artwork)),
  }),

  data: (query, _artTag) => ({
    numArtworksIndirectly: query.indirectArtworks.length,
    numArtworksDirectly: query.directArtworks.length,
    numArtworksTotal: query.allArtworks.length,

    onlyFeaturedIndirectly:
      query.allArtworks.map(artwork => !query.directArtworks.includes(artwork)),

    hasMixedDirectIndirect:
      query.allArtworks.some(artwork => query.directArtworks.includes(artwork)) &&
      query.allArtworks.some(artwork => !query.directArtworks.includes(artwork)),

    allWarnings:
      query.allArtworks
        .flatMap(artwork => artwork?.contentWarnings),
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},
    showTitle: {type: 'boolean'},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('artTagGalleryPage.artworks', capsule =>
      html.tag('div', {id: 'art-tag-artworks-gallery'},
        slots.attributes,
        {[html.onlyIfContent]: true},

        html.tag('section',
          slots.showTitle &&
            html.tag('h2',
              language.$(capsule, 'title')),

        html.tag('p', {class: 'quick-info'},
          data.numArtworksTotal === 0 &&
            language.encapsulate(capsule, 'featuredLine.notFeatured', capsule => [
              language.$(capsule),
              html.tag('br'),
              language.$(capsule, 'callToAction'),
            ]),

          data.numArtworksTotal >= 1 &&
            relations.featuredLine.cloneWithSlots({
              string:
                (data.hasMixedDirectIndirect
                  ? 'altogether'
                  : 'simple'),

              filter: 'all',
              count: data.numArtworksTotal,
            }),

          data.hasMixedDirectIndirect && [
            relations.featuredLine.cloneWithSlots({
              string: 'direct',
              filter: 'direct',
              count: data.numArtworksDirectly,
            }),

            relations.featuredLine.cloneWithSlots({
              string: 'indirect',
              filter: 'indirect',
              count: data.numArtworksIndirectly,
            }),
          ],

          data.hasMixedDirectIndirect && [
            html.tag('br'),

            relations.showingLine.cloneWithSlots({filter: 'all'}),
            relations.showingLine.cloneWithSlots({filter: 'direct'}),
            relations.showingLine.cloneWithSlots({filter: 'indirect'}),
          ]),

        relations.coverGrid.slots({
          lazy: 12,
          allWarnings: data.allWarnings,

          items:
            stitchArrays({
              item: relations.coverGridItems,
              onlyFeaturedIndirectly: data.onlyFeaturedIndirectly,
            }).map(({item, onlyFeaturedIndirectly}) =>
                item.slots({
                  attributes: [
                    onlyFeaturedIndirectly &&
                      {class: 'featured-indirectly'},
                  ],
                })),
        })))),
};
