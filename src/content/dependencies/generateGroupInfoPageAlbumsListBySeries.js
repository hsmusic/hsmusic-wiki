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

    seriesItems:
      group.serieses
        .map(series => series.albums
          .map(album =>
            relation('generateGroupInfoPageAlbumsListItem',
              album,
              group))),
  }),

  data: (query, group) => ({
    seriesNames:
      group.serieses
        .map(series => series.name),

    seriesItemsShowArtists:
      group.serieses.map(series =>
        (series.showAlbumArtists === 'all'
          ? new Array(series.albums.length).fill(true)
       : series.showAlbumArtists === 'differing'
          ? series.albums.map(album =>
              album.artistContribs
                .map(contrib => contrib.artist)
                .some(artist => !query.closelyLinkedArtists.includes(artist)))
          : new Array(series.albums.length).fill(false))),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('groupInfoPage.albumList', listCapsule =>
      html.tag('dl',
        {id: 'group-album-list-by-series'},
        {class: 'group-series-list'},

        {[html.onlyIfContent]: true},

        stitchArrays({
          name: data.seriesNames,
          itemsShowArtists: data.seriesItemsShowArtists,
          heading: relations.seriesHeadings,
          items: relations.seriesItems,
        }).map(({
            name,
            itemsShowArtists,
            heading,
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
                html.tag('ul',
                  stitchArrays({
                    item: items,
                    showArtists: itemsShowArtists,
                  }).map(({item, showArtists}) =>
                      item.slots({
                        accentMode:
                          (showArtists ? 'artists' : null),
                      })))),
            ])))),
};
