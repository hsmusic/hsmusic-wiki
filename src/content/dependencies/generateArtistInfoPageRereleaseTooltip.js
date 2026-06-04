import {sortAlbumsTracksChronologically} from '#sort';

export default {
  query(track, artist) {
    const query = {};

    const regularReleases =
      track.allReleases
        .filter(track => track.album.style !== 'meta');

    query.firstRelease =
      sortAlbumsTracksChronologically(regularReleases)[0];

    const contribs = [
      ...query.firstRelease.artistContribs,
      ...query.firstRelease.contributorContribs,
    ];

    query.creditedOnFirstRelease =
      contribs.some(contrib => contrib.artist === artist);

    return query;
  },

  relations: (relation, query, track, artist) => ({
    tooltip:
      relation('generateTooltip'),

    rereleaseColorStyle:
      relation('generateColorStyleAttribute', track.color),

    firstReleaseLink:
      (query.creditedOnFirstRelease
        ? relation('linkOtherReleaseOnArtistInfoPage', query.firstRelease, artist)
        : relation('linkTrackAsRelease', query.firstRelease)),
  }),

  data: (query, track, artist) => ({
    artistName:
      artist.name,

    rereleaseDate:
      track.date,

    firstReleaseDate:
      query.firstRelease.date,

    creditedOnFirstRelease:
      query.creditedOnFirstRelease,
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

          !data.creditedOnFirstRelease && [
            html.tag('hr', {class: 'cute'}),

            html.tag('span', {class: 'not-credited-on-first-release'},
              language.$(capsule, 'notCreditedOnFirstRelease', {
                artist: data.artistName,
              })),
          ],
        ],
      })),
};
