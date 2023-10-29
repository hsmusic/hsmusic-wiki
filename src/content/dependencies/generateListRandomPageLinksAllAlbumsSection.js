import {sortChronologically} from '#wiki-data';

export default {
  contentDependencies: ['generateListRandomPageLinksAlbumLink', 'linkGroup'],
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({albumData}) => ({albumData}),

  query: (sprawl) => ({
    albums:
      sortChronologically(sprawl.albumData.slice())
        .filter(album => album.tracks.length > 1),
  }),

  relations: (relation, query) => ({
    albumLinks:
      query.albums
        .map(album => relation('generateListRandomPageLinksAlbumLink', album)),
  }),

  generate: (relations, {html, language}) =>
    html.tags([
      html.tag('dt',
        language.$('listingPage.other.randomPages.fromAlbum')),

      html.tag('dd',
        html.tag('ul',
          relations.albumLinks
            .map(albumLink =>
              html.tag('li',
                language.$('listingPage.other.randomPages.album', {
                  album: albumLink,
                }))))),
    ]),
};
