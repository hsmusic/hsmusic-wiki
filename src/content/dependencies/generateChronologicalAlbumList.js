export default {
  contentDependencies: [
    'generateAbsoluteDatetimestamp',
    'generateChronologicalList',
    'generateRelativeDatetimestamp',
    'linkAlbum',
  ],

  relations: (relation, albums, relativeDate = null) => ({
    chronologicalList:
      relation('generateChronologicalList'),

    albumLinks:
      albums.map(album => relation('linkAlbum', album)),

    datetimestamps:
      albums.map(album =>
        (relativeDate
          ? relation('generateRelativeDatetimestamp',
              album.date,
              relativeDate)
          : relation('generateAbsoluteDatetimestamp',
              album.date))),
  }),

  data: (albums) => ({
    dates:
      albums.map(album => album.date),
  }),

  generate: (data, relations) =>
    relations.chronologicalList.slots({
      string: 'album',

      division: 'year',

      itemDates: data.dates,

      itemDatetimestamps:
        relations.datetimestamps
          .map(datetimestamp =>
            datetimestamp.slots({
              style: 'year',
              tooltip: true,
            })),

      itemTitles: relations.albumLinks,
    }),
};
