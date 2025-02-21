import {sortChronologically} from '#sort';
import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generateTooltip',
    'linkOtherReleaseOnArtistInfoPage',
  ],

  extraDependencies: ['html', 'language'],

  query: (track) => ({
    rereleases:
      sortChronologically(track.allReleases).slice(1),
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
      track.dateFirstReleased ??
      track.album.date,

    rereleaseDates:
      query.rereleases
        .map(rerelease =>
          rerelease.dateFirstReleased ??
          rerelease.album.date),
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
