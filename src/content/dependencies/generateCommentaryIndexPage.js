import multilingualWordCount from 'word-count';

import {sortChronologically} from '#sort';
import {accumulateSum, filterMultipleArrays, stitchArrays} from '#sugar';

export default {
  sprawl: ({albumData}) =>
    ({albumData}),

  query(sprawl) {
    const query = {};

    query.albums =
      sortChronologically(sprawl.albumData.slice());

    const entries =
      query.albums.map(album =>
        [album, ...album.tracks]
          .filter(({commentary}) => commentary)
          .flatMap(({commentary}) => commentary));

    query.bodies =
      entries.map(entries => entries.map(entry => entry.body));

    query.entryCounts =
      entries.map(entries => entries.length);

    filterMultipleArrays(query.albums, query.bodies, query.entryCounts,
      (album, bodies, entryCount) => entryCount >= 1);

    return query;
  },

  relations: (relation, query) => ({
    layout:
      relation('generatePageLayout'),

    albumLinks:
      query.albums
        .map(album => relation('linkAlbumCommentary', album)),

    albumBodies:
      query.bodies
        .map(bodies => bodies
          .map(body => relation('transformContent', body))),
  }),

  data: (query) => ({
    entryCounts: query.entryCounts,
    totalEntryCount: accumulateSum(query.entryCounts),
  }),

  generate(data, relations, {html, language}) {
    const wordCounts =
      relations.albumBodies.map(bodies =>
        accumulateSum(bodies, body =>
          multilingualWordCount(
            html.resolve(
              body.slot('mode', 'multiline'),
              {normalize: 'plain'}))));

    const totalWordCount =
      accumulateSum(wordCounts);

    const {entryCounts, totalEntryCount} = data;

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
