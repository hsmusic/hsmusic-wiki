import {sortChronologically} from '#sort';

export default {
  contentDependencies: ['generateColorStyleAttribute', 'generateTooltip'],
  extraDependencies: ['html', 'language'],

  query: (track) => ({
    firstRelease:
      sortChronologically(track.allReleases)[0],
  }),

  relations: (relation, query, track) => ({
    tooltip:
      relation('generateTooltip'),

    rereleaseColorStyle:
      relation('generateColorStyleAttribute', track.color),

    firstReleaseColorStyle:
      relation('generateColorStyleAttribute', query.firstRelease.color),
  }),

  data: (query, track) => ({
    firstReleaseAlbumName:
      query.firstRelease.album.name,

    rereleaseDate:
      track.dateFirstReleased ??
      track.album.date,

    firstReleaseDate:
      query.firstRelease.dateFirstReleased ??
      query.firstRelease.album.date,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('artistPage.creditList.entry.rerelease', capsule =>
      relations.tooltip.slots({
        attributes: [
          {class: 'rerelease-tooltip'},
          relations.rereleaseColorStyle,
        ],

        content: [
          language.$(capsule, 'firstRelease', {
            album:
              html.metatag('blockwrap',
                html.tag('a',
                  {href: '#'},
                  relations.firstReleaseColorStyle.slot('context', 'primary-only'),

                  language.sanitize(data.firstReleaseAlbumName))),
          }),

          html.tag('br'),

          language.formatRelativeDate(data.firstReleaseDate, data.rereleaseDate, {
            considerRoundingDays: true,
            approximate: true,
            absolute: true,
          }),
        ],
      })),
};
