import {sortChronologically} from '#sort';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generateTooltip',
    'linkOtherReleaseOnArtistInfoPage'
  ],

  extraDependencies: ['html', 'language'],

  query: (track) => ({
    firstRelease:
      sortChronologically(track.allReleases)[0],
  }),

  relations: (relation, query, track, artist) => ({
    tooltip:
      relation('generateTooltip'),

    rereleaseColorStyle:
      relation('generateColorStyleAttribute', track.color),

    firstReleaseLink:
      relation('linkOtherReleaseOnArtistInfoPage', query.firstRelease, artist),
  }),

  data: (query, track) => ({
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
              html.metatag('blockwrap', relations.firstReleaseLink),
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
