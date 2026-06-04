import {sortAlbumsTracksChronologically} from '#sort';
import {stitchArrays} from '#sugar';

export default {
query: (track, artist) => ({
  rereleases:
    sortAlbumsTracksChronologically(
      track.otherReleases
        .filter(track => track.album.style !== 'meta')
        .filter(track => {
          const contribs = [
            ...track.artistContribs,
            ...track.contributorContribs,
          ];

          return contribs.some(contrib => contrib.artist === artist);
        })),
}),

  relations: (relation, query, track, artist) => ({
    tooltip:
      relation('generateTooltip'),

    firstReleaseColorStyle:
      relation('generateColorStyleAttribute', track.color),

    rereleaseLinks:
      query.rereleases
        .map(rerelease =>
          relation('linkOtherReleaseOnArtistInfoPage', rerelease, artist)),
  }),

  data: (query, track) => ({
    firstReleaseDate:
      track.date,

    rereleaseDates:
      query.rereleases
        .map(rerelease => rerelease.date),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('artistPage.creditList.entry.firstRelease', capsule =>
      relations.tooltip.slots({
        attributes: [
          {class: 'first-release-tooltip'},
          relations.firstReleaseColorStyle,
        ],

        contentAttributes: [
          {[html.joinChildren]: html.tag('hr', {class: 'cute'})},
        ],

        content:
          stitchArrays({
            rereleaseLink: relations.rereleaseLinks,
            rereleaseDate: data.rereleaseDates,
          }).map(({rereleaseLink, rereleaseDate}) =>
              html.tags([
                language.$(capsule, 'rerelease', {
                  album:
                    html.metatag('blockwrap', rereleaseLink),
                }),

                html.tag('br'),

                language.formatRelativeDate(rereleaseDate, data.firstReleaseDate, {
                  considerRoundingDays: true,
                  approximate: true,
                  absolute: true,
                }),
              ])),
      })),
};
