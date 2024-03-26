import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum'],
  extraDependencies: ['language', 'wikiData'],

  relations: (relation, listing) => ({
    page:
      relation('generateListingPage', listing),

    albumLinks:
      listing.data.albums
        .map(album => relation('linkAlbum', album)),
  }),

  data: (listing) => ({
    durations:
      listing.data.durations,
  }),

  generate: (data, relations, {language}) =>
    relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.albumLinks,
          duration: data.durations,
        }).map(({link, duration}) => ({
            album: link,
            duration: language.formatDuration(duration),
          })),
    }),
};
