import {empty, stitchArrays} from '#sugar';
import {getNewAdditions, getNewReleases} from '#wiki-data';

export default {
  contentDependencies: [
    'generateWikiHomepageContentRow',
    'generateCoverCarousel',
    'generateCoverGrid',
    'image',
    'linkAlbum',
    'transformContent',
  ],

  extraDependencies: ['language', 'wikiData'],

  sprawl({albumData}, row) {
    const sprawl = {};

    switch (row.sourceGroup) {
      case 'new-releases':
        sprawl.albums = getNewReleases(row.countAlbumsFromGroup, {albumData});
        break;

      case 'new-additions':
        sprawl.albums = getNewAdditions(row.countAlbumsFromGroup, {albumData});
        break;

      default:
        sprawl.albums =
          (row.sourceGroup
            ? row.sourceGroup.albums
                .slice()
                .reverse()
                .filter(album => album.isListedOnHomepage)
                .slice(0, row.countAlbumsFromGroup)
            : []);
    }

    if (!empty(row.sourceAlbums)) {
      sprawl.albums.push(...row.sourceAlbums);
    }

    return sprawl;
  },

  relations: (relation, sprawl, row) => ({
    contentRow:
      relation('generateWikiHomepageContentRow', row),

    coverGrid:
      (row.displayStyle === 'grid'
        ? relation('generateCoverGrid')
        : null),

    coverCarousel:
      (row.displayStyle === 'carousel'
        ? relation('generateCoverCarousel')
        : null),

    links:
      sprawl.albums
        .map(album => relation('linkAlbum', album)),

    images:
      sprawl.albums
        .map(album => relation('image', album.artTags)),

    actionLinks:
      row.actionLinks
        .map(content => relation('transformContent', content)),
  }),

  data: (sprawl, row) => ({
    displayStyle:
      row.displayStyle,

    names:
      (row.displayStyle === 'grid'
        ? sprawl.albums
            .map(album => album.name)
        : null),

    paths:
      sprawl.albums
        .map(album =>
          (album.hasCoverArt
            ? ['media.albumCover', album.directory, album.coverArtFileExtension]
            : null)),
  }),

  generate(data, relations, {language}) {
    // Grids and carousels share some slots! Very convenient.
    const commonSlots = {};

    commonSlots.links =
      relations.links;

    commonSlots.images =
      stitchArrays({
        image: relations.images,
        path: data.paths,
        name: data.names ?? data.paths.slice().fill(null),
      }).map(({image, path, name}) =>
          image.slots({
            path,
            missingSourceContent:
              language.$('misc.coverGrid.noCoverArt', {
                [language.onlyIfOptions]: ['album'],
                album: name,
              }),
            }));

    commonSlots.actionLinks =
      relations.actionLinks
        .map(contents =>
          contents
            .slot('mode', 'single-link')
            .content);

    let content;

    switch (data.displayStyle) {
      case 'grid':
        content =
          relations.coverGrid.slots({
            ...commonSlots,
            names: data.names,
          });
        break;

      case 'carousel':
        content =
          relations.coverCarousel.slots(commonSlots);
        break;
    }

    return relations.contentRow.slots({content});
  },
};
