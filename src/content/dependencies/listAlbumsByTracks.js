import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum'],
  extraDependencies: ['language'],

  relations: (relation, listing) => ({
    page:
      relation('generateListingPage', listing),

    albumLinks:
      listing.data.albums
        .map(album => relation('linkAlbum', album)),
  }),

  data: (listing) => ({
    counts:
      listing.data.counts,
  }),

  generate: (data, relations, {language}) =>
    relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.albumLinks,
          count: data.counts,
        }).map(({link, count}) => ({
            album: link,
            tracks: language.countTracks(count, {unit: true}),
          })),
    }),
};
