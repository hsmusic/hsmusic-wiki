import {empty} from '#sugar';
import {sortChronologically} from '#wiki-data';

export default {
  contentDependencies: [
    'generateListingPage',
    'generateListRandomPageLinksAlbumLink',
    'linkGroup',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({wikiInfo}) => ({wikiInfo}),

  query(sprawl, spec) {
    const query = {spec};

    const groups = sprawl.wikiInfo.divideTrackListsByGroups;

    query.divideByGroups = !empty(groups);

    if (query.divideByGroups) {
      query.groups = groups;

      query.groupAlbums =
        groups
          .map(group =>
            group.albums.filter(album => album.tracks.length > 1));
    } else {
      query.undividedAlbums =
        sortChronologically(sprawl.albumData.slice())
          .filter(album => album.tracks.length > 1);
    }

    return query;
  },

  relations(relation, query) {
    const relations = {};

    relations.page =
      relation('generateListingPage', query.spec);

    if (query.divideByGroups) {
      relations.groupLinks =
        query.groups
          .map(group => relation('linkGroup', group));

      relations.groupAlbumLinks =
        query.groupAlbums
          .map(albums => albums
            .map(album =>
              relation('generateListRandomPageLinksAlbumLink', album)));
    } else {
      relations.undividedAlbumLinks =
        query.undividedAlbums
          .map(album =>
            relation('generateListRandomPageLinksAlbumLink', album));
    }

    return relations;
  },

  data(query) {
    const data = {};

    if (query.divideByGroups) {
      data.groupDirectories =
        query.groups
          .map(group => group.directory);
    }

    return data;
  },

  generate(data, relations, {html, language}) {
    const miscellaneousChunkRows = [
      {
        stringsKey: 'randomArtist',

        mainLink:
          html.tag('a',
            {href: '#', 'data-random': 'artist'},
            language.$('listingPage.other.randomPages.chunk.item.randomArtist.mainLink')),

        atLeastTwoContributions:
          html.tag('a',
            {href: '#', 'data-random': 'artist-more-than-one-contrib'},
            language.$('listingPage.other.randomPages.chunk.item.randomArtist.atLeastTwoContributions')),
      },

      {stringsKey: 'randomAlbumWholeSite'},
      {stringsKey: 'randomTrackWholeSite'},
    ];

    const miscellaneousChunkRowAttributes = [
      null,
      {href: '#', 'data-random': 'album'},
      {href: '#','data-random': 'track'},
    ];

    return relations.page.slots({
      type: 'chunks',

      content: [
        html.tag('p',
          language.$('listingPage.other.randomPages.chooseLinkLine', {
            fromPart:
              (relations.groupLinks
                ? language.$('listingPage.other.randomPages.chooseLinkLine.fromPart.dividedByGroups')
                : language.$('listingPage.other.randomPages.chooseLinkLine.fromPart.notDividedByGroups')),

            browserSupportPart:
              language.$('listingPage.other.randomPages.chooseLinkLine.browserSupportPart'),
          })),

        html.tag('p',
          {class: 'js-hide-once-data'},
          language.$('listingPage.other.randomPages.dataLoadingLine')),

        html.tag('p',
          {class: 'js-show-once-data'},
          language.$('listingPage.other.randomPages.dataLoadedLine')),
      ],

      showSkipToSection: true,

      chunkIDs: [
        null,
        ...data.groupDirectories,
      ],

      chunkTitles: [
        {stringsKey: 'misc'},

        ...
          (relations.groupLinks
            ? relations.groupLinks.map(groupLink => ({
                stringsKey: 'fromGroup',
                group: groupLink,
              }))
            : [{stringsKey: 'fromAlbum'}]),
      ],

      chunkTitleAccents: [
        null,

        ...
          (relations.groupLinks
            ? relations.groupLinks.map(() => ({
                randomAlbum:
                  html.tag('a',
                    {href: '#', 'data-random': 'album-in-group-dl'},
                    language.$('listingPage.other.randomPages.chunk.title.fromGroup.accent.randomAlbum')),

                randomTrack:
                  html.tag('a',
                    {href: '#', 'data-random': 'track-in-group-dl'},
                    language.$('listingPage.other.randomPages.chunk.title.fromGroup.accent.randomTrack')),
              }))
            : [null]),
      ],

      chunkRows: [
        miscellaneousChunkRows,

        ...
          (relations.groupAlbumLinks
            ? relations.groupAlbumLinks.map(albumLinks =>
                albumLinks.map(albumLink => ({
                  stringsKey: 'album',
                  album: albumLink,
                })))
            : relations.albumLinks.map(albumLink => ({
                stringsKey: 'album',
                album: albumLink,
              }))),
      ],

      chunkRowAttributes: [
        miscellaneousChunkRowAttributes,
        ...
          (relations.groupAlbumLinks
            ? relations.groupAlbumLinks.map(albumLinks =>
                albumLinks.map(() => null))
            : [relations.albumLinks.map(() => null)]),
      ],
    });
  },
};
