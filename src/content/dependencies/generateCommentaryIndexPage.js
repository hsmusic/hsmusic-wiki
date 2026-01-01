import {sortChronologically} from '#sort';

import {
  accumulateSum,
  empty,
  filterMultipleArrays,
  stitchArrays,
  transposeArrays,
} from '#sugar';

export default {
  sprawl: ({albumData}) =>
    ({albumData}),

  query(sprawl) {
    const query = {};

    query.albums =
      sortChronologically(sprawl.albumData.slice());

    query.entries =
      query.albums.map(album =>
        [album, ...album.tracks]
          .flatMap(({commentary}) => commentary));

    filterMultipleArrays(query.albums, query.entries,
      (_album, entries) => !empty(entries));

    return query;
  },

  relations: (relation, query) => ({
    layout:
      relation('generatePageLayout'),

    albumLinks:
      query.albums
        .map(album => relation('linkAlbumCommentary', album)),

    albumTotals:
      query.entries
        .map(entries => relation('getContentEntryTotals', entries)),
  }),

  generate(relations, {html, language}) {
    const [wordCounts, entryCounts] =
      transposeArrays(
        relations.albumTotals.map(totals => [
          totals.wordCount,
          totals.entryCount,
        ]));

    const totalWordCount =
      accumulateSum(wordCounts);

    const totalEntryCount =
      accumulateSum(entryCounts);

    return language.encapsulate('commentaryIndex', pageCapsule =>
      relations.layout.slots({
        title: language.$(pageCapsule, 'title'),

        headingMode: 'static',

        mainClasses: ['long-content'],
        mainContent: [
          html.tag('p', language.$(pageCapsule, 'infoLine', {
            words:
              html.tag('b',
                language.formatWordCount(totalWordCount, {unit: true})),

            entries:
              html.tag('b',
                language.countCommentaryEntries(totalEntryCount, {unit: true})),
          })),

          language.encapsulate(pageCapsule, 'albumList', listCapsule => [
            html.tag('p',
              language.$(listCapsule, 'title')),

            html.tag('ul',
              stitchArrays({
                albumLink: relations.albumLinks,
                wordCount: wordCounts,
                entryCount: entryCounts,
              }).map(({albumLink, wordCount, entryCount}) =>
                html.tag('li',
                  language.$(listCapsule, 'item', {
                    album: albumLink,
                    words: language.formatWordCount(wordCount, {unit: true}),
                    entries: language.countCommentaryEntries(entryCount, {unit: true}),
                  })))),
          ]),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {auto: 'current'},
        ],
      }));
  },
};
