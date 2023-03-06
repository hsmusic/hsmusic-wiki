// Album commentary page and index specifications.

import {generateAlbumExtrasPageNav} from './album.js';
import {accumulateSum} from '../util/sugar.js';
import {filterAlbumsByCommentary} from '../util/wiki-data.js';

export const description = `per-album artist commentary pages & index`

export function condition({wikiData}) {
  return filterAlbumsByCommentary(wikiData.albumData).length;
}

export function targets({wikiData}) {
  return filterAlbumsByCommentary(wikiData.albumData);
}

export function write(album) {
  const entries = [album, ...album.tracks]
    .filter((x) => x.commentary)
    .map((x) => x.commentary);
  const words = entries.join(' ').split(' ').length;

  const page = {
    type: 'page',
    path: ['albumCommentary', album.directory],
    page: ({
      getAlbumStylesheet,
      getLinkThemeString,
      getThemeString,
      html,
      language,
      link,
      transformMultiline,
    }) => ({
      title: language.$('albumCommentaryPage.title', {album: album.name}),
      stylesheet: getAlbumStylesheet(album),
      theme: getThemeString(album.color),

      main: {
        classes: ['long-content'],
        headingMode: 'sticky',

        content: [
          html.tag('p',
            language.$('albumCommentaryPage.infoLine', {
              words: html.tag('b', language.formatWordCount(words, {unit: true})),
              entries: html.tag('b', language.countCommentaryEntries(entries.length, {unit: true})),
            })),

          ...html.fragment(album.commentary && [
            html.tag('h3',
              {class: ['content-heading']},
              language.$('albumCommentaryPage.entry.title.albumCommentary')),

            html.tag('blockquote',
              transformMultiline(album.commentary)),
          ]),

          ...album.tracks.filter(t => t.commentary).flatMap(track => [
            html.tag('h3',
              {id: track.directory, class: ['content-heading']},
              language.$('albumCommentaryPage.entry.title.trackCommentary', {
                track: link.track(track),
              })),

            html.tag('blockquote',
              {style: getLinkThemeString(track.color)},
              transformMultiline(track.commentary)),
          ])
        ],
      },

      nav: generateAlbumExtrasPageNav(album, 'commentary', {
        html,
        language,
        link,
      }),
    }),
  };

  return [page];
}

export function writeTargetless({wikiData}) {
  const data = filterAlbumsByCommentary(wikiData.albumData)
    .map((album) => ({
      album,
      entries: [album, ...album.tracks]
        .filter((x) => x.commentary)
        .map((x) => x.commentary),
    }))
    .map(({album, entries}) => ({
      album,
      entries,
      words: entries.join(' ').split(' ').length,
    }));

  const totalEntries = accumulateSum(data, ({entries}) => entries.length);
  const totalWords = accumulateSum(data, ({words}) => words);

  const page = {
    type: 'page',
    path: ['commentaryIndex'],
    page: ({
      html,
      language,
      link,
    }) => ({
      title: language.$('commentaryIndex.title'),

      main: {
        classes: ['long-content'],
        headingMode: 'static',

        content: [
          html.tag('p', language.$('commentaryIndex.infoLine', {
            words: html.tag('b', language.formatWordCount(totalWords, {unit: true})),
            entries: html.tag('b', language.countCommentaryEntries(totalEntries, {unit: true})),
          })),

          html.tag('p', language.$('commentaryIndex.albumList.title')),

          html.tag('ul', data.map(({album, entries, words}) =>
            html.tag('li', language.$('commentaryIndex.albumList.item', {
              album: link.albumCommentary(album),
              words: language.formatWordCount(words, {unit: true}),
              entries: language.countCommentaryEntries(entries.length, {unit: true}),
            })))),
        ],
      },

      nav: {simple: true},
    }),
  };

  return [page];
}
