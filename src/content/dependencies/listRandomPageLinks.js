import {sortChronologically} from '#sort';
import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateListingPage',
    'generateListRandomPageLinksAlbumLink',
    'linkGroup',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({albumData, wikiInfo}) => ({albumData, wikiInfo}),

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
    const capsule = language.encapsulate('listingPage.other.randomPages');

    const miscellaneousChunkRows = [
      language.encapsulate(capsule, 'chunk.item.randomArtist', capsule => ({
        stringsKey: 'randomArtist',

        mainLink:
          html.tag('a',
            {href: '#', 'data-random': 'artist'},
            language.$(capsule, 'mainLink')),

        atLeastTwoContributions:
          html.tag('a',
            {href: '#', 'data-random': 'artist-more-than-one-contrib'},
            language.$(capsule, 'atLeastTwoContributions')),
      })),

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
          language.encapsulate(capsule, 'chooseLinkLine', capsule =>
            language.$(capsule, {
              fromPart:
                (relations.groupLinks
                  ? language.$(capsule, 'fromPart.dividedByGroups')
                  : language.$(capsule, 'fromPart.notDividedByGroups')),

              browserSupportPart:
                language.$(capsule, 'browserSupportPart'),
            }))),

        html.tag('p', {id: 'data-loading-line'},
          language.$(capsule, 'dataLoadingLine')),

        html.tag('p', {id: 'data-loaded-line'},
          language.$(capsule, 'dataLoadedLine')),

        html.tag('p', {id: 'data-error-line'},
          language.$(capsule, 'dataErrorLine')),
      ],

      showSkipToSection: true,

      chunkIDs:
        (data.groupDirectories
          ? [null, ...data.groupDirectories]
          : null),

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
            ? relations.groupLinks.map(() =>
                language.encapsulate(capsule, 'chunk.title.fromGroup.accent', capsule => ({
                  randomAlbum:
                    html.tag('a',
                      {href: '#', 'data-random': 'album-in-group-dl'},
                      language.$(capsule, 'randomAlbum')),

                  randomTrack:
                    html.tag('a',
                      {href: '#', 'data-random': 'track-in-group-dl'},
                      language.$(capsule, 'randomTrack')),
                })))
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
            : [
                relations.undividedAlbumLinks.map(albumLink => ({
                  stringsKey: 'album',
                  album: albumLink,
                })),
              ]),
      ],

      chunkRowAttributes: [
        miscellaneousChunkRowAttributes,
        ...
          (relations.groupAlbumLinks
            ? relations.groupAlbumLinks.map(albumLinks =>
                albumLinks.map(() => null))
            : [relations.undividedAlbumLinks.map(() => null)]),
      ],
    });
  },
};
