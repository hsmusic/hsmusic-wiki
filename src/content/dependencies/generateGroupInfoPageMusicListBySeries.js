import {stitchArrays} from '#sugar';

export default {
  query: (group) => ({
    closelyLinkedArtists:
      group.closelyLinkedArtists
        .map(({artist}) => artist),
  }),

  relations: (relation, _query, group) => ({
    seriesHeadings:
      group.serieses
        .map(() => relation('generateContentHeading')),

    seriesDescriptions:
      group.serieses
        .map(series => relation('transformContent', series.description)),

    seriesItems:
      group.serieses
        .map(series => series.things
          .map(thing =>
            relation('generateGroupInfoPageMusicListItem',
              thing,
              group))),
  }),

  data: (query, group) => ({
    seriesNames:
      group.serieses
        .map(series => series.name),

    seriesItemsShowArtists:
      group.serieses.map(series =>
        (series.showArtists === 'all'
          ? Array.from({length: series.things.length}, () => true)

       : series.showArtists === 'differing'
          ? series.things.map(thing =>
              thing.artistContribs
                .map(contrib => contrib.artist)
                .some(artist => !query.closelyLinkedArtists.includes(artist)))

          : Array.from({length: series.things.length}, () => false))),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('groupInfoPage.musicList', listCapsule =>
      html.tag('dl',
        {id: 'group-music-list-by-series'},
        {class: 'group-series-list'},

        relations.seriesItems.flat().length > 1 &&
        language.$order(listCapsule, 'item.album.withYear', 0) === 'YEAR_ACCENT' &&
          {class: 'offset-tooltips'},

        {[html.onlyIfContent]: true},

        stitchArrays({
          name: data.seriesNames,
          itemsShowArtists: data.seriesItemsShowArtists,
          heading: relations.seriesHeadings,
          description: relations.seriesDescriptions,
          items: relations.seriesItems,
        }).map(({
            name,
            itemsShowArtists,
            heading,
            description,
            items,
          }) =>
            html.tags([
              heading.slots({
                tag: 'dt',
                title:
                  language.$(listCapsule, 'series', {
                    series: name,
                  }),
              }),

              html.tag('dd',
                html.tag('blockquote',
                  {[html.onlyIfContent]: true},
                  description),

                html.tag('ul',
                  stitchArrays({
                    item: items,
                    showArtists: itemsShowArtists,
                  }).map(({item, showArtists}) =>
                      item.slots({
                        detail:
                          (showArtists ? 'artists' : null),
                      })))),
            ])))),
};
