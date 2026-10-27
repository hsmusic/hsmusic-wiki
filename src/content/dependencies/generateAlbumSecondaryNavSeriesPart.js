import {atOffset} from '#sugar';

export default {
  query(series, album, track) {
    const query = {};

    const things =
      series.things;

    const currentIndex =
      (track && things.includes(track)
        ? things.indexOf(track)
        : things.indexOf(album));

    query.previousThing =
      atOffset(things, currentIndex, -1);

    query.nextThing =
      atOffset(things, currentIndex, +1);

    return query;
  },

  relations: (relation, query, series, _album) => ({
    parentSiblingsPart:
      relation('generateSecondaryNavParentSiblingsPart'),

    groupLink:
      relation('linkGroup', series.group),

    colorStyle:
      relation('generateColorStyleAttribute', series.group.color),

    previousAlbumLink:
      (query.previousThing?.isAlbum
        ? relation('linkAlbumDynamically', query.previousThing)
        : null),

    previousTrackLink:
      (query.previousThing?.isTrack
        ? relation('linkTrack', query.previousThing)
        : null),

    nextAlbumLink:
      (query.nextThing?.isAlbum
        ? relation('linkAlbumDynamically', query.nextThing)
        : null),

    nextTrackLink:
      (query.nextThing?.isTrack
        ? relation('linkTrack', query.nextThing)
        : null),
  }),

  data: (_query, series, _album, track) => ({
    name:
      series.name,

    seriesDirectlyIncludesTrack:
      (track
        ? series.things.includes(track)
        : null),
  }),

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'album',
    },
  },

  generate: (data, relations, slots, {language}) =>
    relations.parentSiblingsPart.slots({
      attributes: {class: 'series-nav-links'},

      showPreviousNext:
        slots.mode === 'album' ||
        data.seriesDirectlyIncludesTrack,

      colorStyle: relations.colorStyle,

      mainLink:
        relations.groupLink.slots({
          attributes: {class: 'series'},
          content: language.sanitize(data.name),
        }),

      previousLink:
        relations.previousAlbumLink?.slot('linkCommentaryPages', true) ??
        relations.previousTrackLink ??
        null,

      nextLink:
        relations.nextAlbumLink?.slot('linkCommentaryPages', true) ??
        relations.nextTrackLink ??
        null,

      stringsKey: 'albumSecondaryNav.series',
      mainLinkOption: 'series',
    }),
};
