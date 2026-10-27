import {sortAlbumsTracksChronologically} from '#sort';
import {empty} from '#sugar';

export default {
  query(series) {
    const query = {};

    query.things =
      series.things.toReversed();

    const thingsLatestFirst =
      sortAlbumsTracksChronologically(
        series.things.slice(),
        {latestFirst: true});

    query.allDated =
      series.things.length >= 1 &&
      series.things.every(thing => thing.date);

    query.latest =
      thingsLatestFirst.filter(thing => thing.date).at(0) ??
      null;

    query.earliest =
      thingsLatestFirst.filter(thing => thing.date).at(-1) ??
      null;

    query.composition =
      (empty(query.things)
        ? 'empty'
     : query.things.every(thing => thing.isAlbum)
        ? 'albums'
     : query.things.every(thing => thing.isTrack)
        ? 'tracks'
        : 'mixed');

    query.anyNotFromThisGroup =
      series.things.some(thing => !thing.groups.includes(series.group));

    return query;
  },

  relations: (relation, query, series) => ({
    contentHeading:
      relation('generateContentHeading'),

    grid:
      relation('generateGroupGalleryPageMusicGrid',
        query.things,
        series.group),
  }),

  data: (query, series) => ({
    name:
      series.name,

    groupName:
      series.group.name,

    composition:
      query.composition,

    numAlbums:
      (query.composition === 'albums'
        ? series.things.length
     : query.composition === 'tracks'
        ? null
        : series.things.filter(thing => thing.isAlbum).length),

    numTracks:
      (query.composition === 'albums'
        ? series.things.flatMap(album => album.tracks).length
     : query.composition === 'tracks'
        ? series.things.length
        : series.things.filter(thing => thing.isTrack).length),

    allDated:
      query.allDated,

    anyNotFromThisGroup:
      query.anyNotFromThisGroup,

    earliestAlbumDate:
      (query.earliest
        ? query.earliest.date
        : null),

    latestAlbumDate:
      (query.latest
        ? query.latest.date
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
                data.anyNotFromThisGroup &&
                  language.$(captionCapsule, 'seriesItemsNotFromGroup', {
                    marker:
                      language.$('misc.coverGrid.details.notFromThisGroup.marker'),

                    series:
                      html.tag('i', data.name),

                    group: data.groupName,
                  }),

                language.encapsulate(captionCapsule, workingCapsule => {
                  const workingOptions = {};

                  const tracksFigure =
                    html.tag('b', {[html.onlyIfContent]: true},
                      language.countTracks(data.numTracks, {unit: true}));

                  const albumsFigure =
                    html.tag('b', {[html.onlyIfContent]: true},
                      language.countAlbums(data.numAlbums, {unit: true}));

                  if (data.composition === 'albums') {
                    workingOptions.tracks = tracksFigure;
                    workingOptions.albums = albumsFigure;
                  } else if (data.composition === 'tracks') {
                    workingCapsule += '.tracksOnly';
                    workingOptions.tracks = tracksFigure;
                  } else {
                    workingCapsule += '.mixedTracksAndAlbums';
                    workingOptions.tracks = tracksFigure;
                    workingOptions.albums = albumsFigure;
                  }

                  if (data.allDated) {
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
