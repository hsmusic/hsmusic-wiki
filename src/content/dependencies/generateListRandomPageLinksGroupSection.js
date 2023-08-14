import {stitchArrays} from '../../util/sugar.js';
import {sortChronologically} from '../../util/wiki-data.js';

export default {
  contentDependencies: ['generateColorStyleVariables', 'linkGroup'],
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({albumData}) => ({albumData}),

  query: (sprawl, group) => ({
    albums:
      sortChronologically(sprawl.albumData.slice())
        .filter(album => album.groups.includes(group)),
  }),

  relations: (relation, query, sprawl, group) => ({
    groupLink:
      relation('linkGroup', group),

    albumColorVariables:
      query.albums
        .map(() => relation('generateColorStyleVariables')),
  }),

  data: (query, sprawl, group) => ({
    groupDirectory:
      group.directory,

    albumColors:
      query.albums
        .map(album => album.color),

    albumDirectories:
      query.albums
        .map(album => album.directory),

    albumNames:
      query.albums
        .map(album => album.name),
  }),

  generate: (data, relations, {html, language}) =>
    html.tags([
      html.tag('dt',
        language.$('listingPage.other.randomPages.group', {
          group: relations.groupLink,

          randomAlbum:
            html.tag('a',
              {href: '#', 'data-random': 'album-in-' + data.groupDirectory},
              language.$('listingPage.other.randomPages.group.randomAlbum')),

          randomTrack:
            html.tag('a',
              {href: '#', 'data-random': 'track-in-' + data.groupDirectory},
              language.$('listingPage.other.randomPages.group.randomTrack')),
        })),

      html.tag('dd',
        html.tag('ul',
          stitchArrays({
            colorVariables: relations.albumColorVariables,
            color: data.albumColors,
            directory: data.albumDirectories,
            name: data.albumNames,
          }).map(({colorVariables, color, directory, name}) =>
              html.tag('li',
                language.$('listingPage.other.randomPages.album', {
                  album:
                    html.tag('a', {
                      href: '#',
                      'data-random': 'track-in-album',
                      style:
                        colorVariables.slot('color', color).content +
                        '; ' +
                        `--album-directory: ${directory}`,
                    }, name),
                }))))),
    ]),
};
