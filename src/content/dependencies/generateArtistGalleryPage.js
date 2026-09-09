import {sortArtworksChronologically} from '#sort';
import {stitchArrays} from '#sugar';

export default {
  query: (artist) => ({
    artworks:
      sortArtworksChronologically(
        ([
          artist.albumCoverArtistContributions,
          artist.trackCoverArtistContributions,
        ]).flat()
          .filter(contrib => !contrib.annotation?.startsWith(`edits for wiki`))
          .map(contrib => contrib.thing)
          .filter(artwork => !artwork.isReusedArtwork),
        {latestFirst: true}),
  }),

  relations: (relation, query, artist) => ({
    layout:
      relation('generatePageLayout'),

    artistNavLinks:
      relation('generateArtistNavLinks', artist),

    coverGrid:
      relation('generateCoverGrid'),

    coverGridItems:
      query.artworks
        .map(artwork => relation('generateCoverGridItem', artwork)),
  }),

  data: (query, artist) => ({
    name:
      artist.name,

    numArtworks:
      query.artworks.length,

    otherCoverArtists:
      query.artworks
        .map(artwork => artwork.artistContribs
          .filter(contrib => contrib.artist !== artist)
          .map(contrib => contrib.artist.name)),

    allWarnings:
      query.artworks
        .flatMap(artwork => artwork.contentWarnings),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('artistGalleryPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            artist: data.name,
          }),

        headingMode: 'static',

        mainClasses: ['top-index'],
        mainContent: [
          html.tag('p', {class: 'quick-info'},
            language.$(pageCapsule, 'infoLine', {
              coverArts:
                language.countArtworks(data.numArtworks, {
                  unit: true,
                }),
            })),

          relations.coverGrid.slots({
            allWarnings: data.allWarnings,

            items:
              stitchArrays({
                item: relations.coverGridItems,
                otherCoverArtists: data.otherCoverArtists,
              }).map(({item, otherCoverArtists}) =>
                  item.slot('details',
                    language.$('misc.coverGrid.details.otherCoverArtists', {
                      [language.onlyIfOptions]: ['artists'],
                      artists: language.formatUnitList(otherCoverArtists),
                    }))),
          }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          relations.artistNavLinks
            .slots({
              showExtraLinks: true,
              currentExtra: 'gallery',
            })
            .content,
      })),
}
