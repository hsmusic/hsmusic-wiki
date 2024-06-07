import {empty, stitchArrays} from '#sugar';
import {getNewAdditions, getNewReleases} from '#wiki-data';

export default {
  contentDependencies: [
    'generateWikiHomeContentRow',
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

  relations(relation, sprawl, row) {
    const relations = {};

    relations.contentRow =
      relation('generateWikiHomeContentRow', row);

    if (row.displayStyle === 'grid') {
      relations.coverGrid =
        relation('generateCoverGrid');
    }

    if (row.displayStyle === 'carousel') {
      relations.coverCarousel =
        relation('generateCoverCarousel');
    }

    relations.links =
      sprawl.albums
        .map(album => relation('linkAlbum', album));

    relations.images =
      sprawl.albums
        .map(album => relation('image', album.artTags));

    if (row.actionLinks) {
      relations.actionLinks =
        row.actionLinks
          .map(content => relation('transformContent', content));
    }

    return relations;
  },

  data(sprawl, row) {
    const data = {};

    data.displayStyle = row.displayStyle;

    if (row.displayStyle === 'grid') {
      data.names =
        sprawl.albums
          .map(album => album.name);
    }

    data.paths =
      sprawl.albums
        .map(album =>
          (album.hasCoverArt
            ? ['media.albumCover', album.directory, album.coverArtFileExtension]
            : null));

    return data;
  },

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
              language.$('misc.albumGrid.noCoverArt', {
                [language.onlyIfOptions]: ['album'],
                album: name,
              }),
            }));

    commonSlots.actionLinks =
      (relations.actionLinks
        ? relations.actionLinks
            .map(contents =>
              contents
                .slot('mode', 'single-link')
                .content)
        : null);

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
