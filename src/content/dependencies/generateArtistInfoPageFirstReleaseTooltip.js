import {sortChronologically} from '#sort';
import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateColorStyleAttribute', 'generateTooltip'],
  extraDependencies: ['html', 'language'],

  query: (track) => ({
    rereleases:
      sortChronologically(track.allReleases).slice(1),
  }),

  relations: (relation, query, track) => ({
    tooltip:
      relation('generateTooltip'),

    firstReleaseColorStyle:
      relation('generateColorStyleAttribute', track.color),

    rereleaseColorStyles:
      query.rereleases
        .map(rerelease =>
          relation('generateColorStyleAttribute', rerelease.album.color)),
  }),

  data: (query, track) => ({
    firstReleaseDate:
      track.dateFirstReleased ??
      track.album.date,

    rereleaseAlbumNames:
      query.rereleases
        .map(rerelease => rerelease.album.name),

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
            colorStyle: relations.rereleaseColorStyles,
            albumName: data.rereleaseAlbumNames,
            date: data.rereleaseDates,
          }).map(({colorStyle, albumName, date}) =>
              html.tags([
                language.$(capsule, 'rerelease', {
                  album:
                    html.metatag('blockwrap',
                      html.tag('a',
                        {href: '#'},
                        colorStyle.slot('context', 'primary-only'),

                        language.sanitize(albumName))),
                }),

                html.tag('br'),

                language.formatRelativeDate(date, data.firstReleaseDate, {
                  considerRoundingDays: true,
                  approximate: true,
                  absolute: true,
                }),
              ])),
      })),
};
