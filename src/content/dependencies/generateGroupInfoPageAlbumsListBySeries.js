import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateContentHeading',
    'generateGroupInfoPageAlbumsListItem',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, group) => ({
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

  data: (group) => ({
    seriesNames:
      group.serieses
        .map(series => series.name),

    seriesShowAlbumArtists:
      group.serieses
        .map(series => series.showAlbumArtists),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('groupInfoPage.albumList', listCapsule =>
      html.tag('dl',
        {id: 'group-album-list-by-series'},
        {class: 'group-series-list'},

        {[html.onlyIfContent]: true},

        stitchArrays({
          name: data.seriesNames,
          showAlbumArtists: data.seriesShowAlbumArtists,
          heading: relations.seriesHeadings,
          items: relations.seriesItems,
        }).map(({
            name,
            showAlbumArtists,
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
                  items.map(item =>
                    item.slots({
                      accentMode:
                        (showAlbumArtists ? 'artists' : null),
                    })))),
            ])))),
};
