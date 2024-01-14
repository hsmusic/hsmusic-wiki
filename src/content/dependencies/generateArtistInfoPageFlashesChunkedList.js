import {stitchArrays} from '#sugar';

import {
  chunkByProperties,
  sortEntryThingPairs,
  sortFlashesChronologically,
} from '#wiki-data';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunk',
    'generateArtistInfoPageChunkItem',
    'linkFlash',
  ],

  extraDependencies: ['html', 'language'],

  query(artist) {
    const entries = [
      ...artist.flashesAsContributor.map(flash => ({
        thing: flash,
        entry: {
          flash,
          act: flash.act,
          contribs: flash.contributorContribs,
        },
      })),
    ];

    sortEntryThingPairs(entries, sortFlashesChronologically);

    const chunks =
      chunkByProperties(
        entries.map(({entry}) => entry),
        ['act']);

    return {chunks};
  },

  relations(relation, query) {
    // Flashes and games can list multiple contributors as collaborative
    // credits, but we don't display these on the artist page, since they
    // usually involve many artists crediting a larger team where collaboration
    // isn't as relevant (without more particular details that aren't tracked
    // on the wiki).

    return {
      chunks:
        query.chunks.map(() => relation('generateArtistInfoPageChunk')),

      actLinks:
        query.chunks.map(({chunk}) =>
          relation('linkFlash', chunk[0].flash)),

      items:
        query.chunks.map(({chunk}) =>
          chunk.map(() => relation('generateArtistInfoPageChunkItem'))),

      itemFlashLinks:
        query.chunks.map(({chunk}) =>
          chunk.map(({flash}) => relation('linkFlash', flash))),
    };
  },

  data(query, artist) {
    return {
      actNames:
        query.chunks.map(({act}) => act.name),

      firstDates:
        query.chunks.map(({chunk}) => chunk[0].flash.date ?? null),

      lastDates:
        query.chunks.map(({chunk}) => chunk.at(-1).flash.date ?? null),

      itemContributions:
        query.chunks.map(({chunk}) =>
          chunk.map(({contribs}) =>
            contribs
              .find(({who}) => who === artist)
              .what)),
    };
  },

  generate(data, relations, {html, language}) {
    return html.tag('dl',
      stitchArrays({
        chunk: relations.chunks,
        actLink: relations.actLinks,
        actName: data.actNames,
        firstDate: data.firstDates,
        lastDate: data.lastDates,

        items: relations.items,
        itemFlashLinks: relations.itemFlashLinks,
        itemContributions: data.itemContributions,
      }).map(({
          chunk,
          actLink,
          actName,
          firstDate,
          lastDate,

          items,
          itemFlashLinks,
          itemContributions,
        }) =>
          chunk.slots({
            mode: 'flash',
            flashActLink: actLink.slot('content', actName),
            dateRangeStart: firstDate,
            dateRangeEnd: lastDate,

            items:
              stitchArrays({
                item: items,
                flashLink: itemFlashLinks,
                contribution: itemContributions,
              }).map(({
                  item,
                  flashLink,
                  contribution,
                }) =>
                  item.slots({
                    contribution,

                    content:
                      language.$('artistPage.creditList.entry.flash', {
                        flash: flashLink,
                      }),
                  })),
          })));
  },
};
