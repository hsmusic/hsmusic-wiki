import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateListingPage', 'linkAlbum'],
  extraDependencies: ['language'],

  relations: (relation, listing) => ({
    page:
      relation('generateListingPage', listing),

    albumLinks:
      listing.data
        .map(album => relation('linkAlbum', album)),
  }),

  data: (listing) => ({
    dates:
      listing.data
        .map(album => album.date),
  }),

  generate: (data, relations, {language}) =>
    relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.albumLinks,
          date: data.dates,
        }).map(({link, date}) => ({
            album: link,
            date: language.formatDate(date),
          })),
    }),
};
