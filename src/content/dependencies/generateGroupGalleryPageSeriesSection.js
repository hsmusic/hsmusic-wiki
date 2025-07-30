import {sortChronologically} from '#sort';

export default {
  contentDependencies: [
    'generateContentHeading',
    'generateGroupGalleryPageAlbumGrid',
  ],

  extraDependencies: ['html', 'language'],

  query(series) {
    const query = {};

    query.albums =
      sortChronologically(series.albums.slice(), {latestFirst: true});

    query.allAlbumsDated =
      series.albums.every(album => album.date);

    query.anyAlbumNotFromThisGroup =
      series.albums.some(album => !album.groups.includes(series.group));

    query.latestAlbum =
      query.albums
        .filter(album => album.date)
        .at(0) ??
      null;

    query.earliestAlbum =
      query.albums
        .filter(album => album.date)
        .at(-1) ??
      null;

    return query;
  },

  relations: (relation, query, series) => ({
    contentHeading:
      relation('generateContentHeading'),

    grid:
      relation('generateGroupGalleryPageAlbumGrid',
        query.albums,
        series.group),
  }),

  data: (query, series) => ({
    name:
      series.name,

    groupName:
      series.group.name,

    albums:
      series.albums.length,

    tracks:
      series.albums
        .flatMap(album => album.tracks)
        .length,

    allAlbumsDated:
      query.allAlbumsDated,

    anyAlbumNotFromThisGroup:
      query.anyAlbumNotFromThisGroup,

    earliestAlbumDate:
      (query.earliestAlbum
        ? query.earliestAlbum.date
        : null),

    latestAlbumDate:
      (query.latestAlbum
        ? query.latestAlbum.date
        : null),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('groupGalleryPage.albumSection', capsule =>
      html.tags([
        relations.contentHeading.slots({
          tag: 'h2',
          title: language.sanitize(data.name),
        }),

        relations.grid.slots({
          cutIndex: 4,

          bottomCaption:
            language.encapsulate(capsule, 'caption', captionCapsule =>
              html.tags([
                data.anyAlbumNotFromThisGroup &&
                  language.$(captionCapsule, 'seriesAlbumsNotFromGroup', {
                    marker:
                      language.$('misc.coverGrid.details.notFromThisGroup.marker'),

                    series:
                      html.tag('i', data.name),

                    group: data.groupName,
                  }),

                language.encapsulate(captionCapsule, workingCapsule => {
                  const workingOptions = {};

                  workingOptions.tracks =
                    html.tag('b',
                      language.countTracks(data.tracks, {unit: true}));

                  workingOptions.albums =
                    html.tag('b',
                      language.countAlbums(data.albums, {unit: true}));

                  if (data.allAlbumsDated) {
                    const earliestDate = data.earliestAlbumDate;
                    const latestDate = data.latestAlbumDate;

                    const earliestYear = earliestDate.getFullYear();
                    const latestYear = latestDate.getFullYear();

                    if (earliestYear === latestYear) {
                      if (data.albums === 1) {
                        workingCapsule += '.withDate';
                        workingOptions.date =
                          language.formatDate(earliestDate);
                      } else {
                        workingCapsule += '.withYear';
                        workingOptions.year =
                          language.formatYear(earliestDate);
                      }
                    } else {
                      workingCapsule += '.withYearRange';
                      workingOptions.yearRange =
                        language.formatYearRange(earliestDate, latestDate);
                    }
                  }

                  return language.$(workingCapsule, workingOptions);
                }),
              ], {[html.joinChildren]: html.tag('br')})),
        }),
      ])),
};
