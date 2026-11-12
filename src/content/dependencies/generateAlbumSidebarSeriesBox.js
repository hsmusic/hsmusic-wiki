import {atOffset} from '#sugar';

export default {
  query(album, track, series) {
    const query = {};

    const things =
      series.things;

    const currentThing =
      (album.style === 'single' && track === album.tracks[0]
        ? album
        : track ?? album);

    const currentIndex = things.indexOf(currentThing);

    query.previousThing =
      atOffset(things, currentIndex, -1);

    query.nextThing =
      atOffset(things, currentIndex, +1);

    return query;
  },

  relations: (relation, query, album, track, series) => ({
    box:
      relation('generatePageSidebarBox'),

    seriesLink:
      relation('linkGroupSeries', series),

    description:
      relation('transformContent', series.description),

    previousThingLink:
      (query.previousThing
        ? relation('linkAnythingMan', query.previousThing)
        : null),

    nextThingLink:
      (query.nextThing
        ? relation('linkAnythingMan', query.nextThing)
        : null),
  }),

  data: (query, _album, track, series) => ({
    name:
      series.name,

    color:
      series.group.color,

    collapse:
      series.group.collapseInAlbumSidebars,

    seriesDirectlyIncludesTrack:
      (track
        ? series.things.includes(track)
        : null),
  }),

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'track',
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('albumSidebar.groupBox', boxCapsule => {
      const collapse =
        slots.mode === 'track' ||
        data.collapse;

      return relations.box.slots({
        attributes: {class: 'individual-series-sidebar-box'},
        color: (collapse ? data.color : null),
        collapse: (collapse ? 'chain' : false),

        title:
          language.$(boxCapsule, 'title', {group: relations.seriesLink}),

        content: [
          relations.description.slot('mode', 'multiline'),

          relations.nextThingLink &&
            html.tag('p', {class: 'series-chronology-link'},
              language.$(boxCapsule, 'next', {
                release: relations.nextThingLink,
              })),

          relations.previousThingLink &&
            html.tag('p', {class: 'series-chronology-link'},
              language.$(boxCapsule, 'previous', {
                release: relations.previousThingLink,
              })),
        ],
      });
    }),
};
