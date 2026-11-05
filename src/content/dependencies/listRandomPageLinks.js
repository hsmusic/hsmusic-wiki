import {sortChronologically} from '#sort';
import {empty} from '#sugar';

export default {
  sprawl: ({albumData, wikiInfo}) => ({albumData, wikiInfo}),

  query(sprawl, spec) {
    const query = {spec};

    const groupishDivisions =
      sprawl.wikiInfo.divideMusicBy
        .filter(thing => thing.isGroup || thing.isGroupCategory);

    query.divide = !empty(groupishDivisions);

    if (query.divide) {
      query.divisions = groupishDivisions;

      query.dividedAlbums =
        groupishDivisions
          .map(division => division.albums
            .filter(album => album.tracks.length > 1));
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

    if (query.divide) {
      relations.divisionLinks =
        query.divisions
          .map(division => relation('linkAnythingMan', division));

      relations.dividedAlbumLinks =
        query.dividedAlbums
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

    if (query.divide) {
      data.divisionDirectories =
        query.divisions
          .map(division => division.directory);
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
                (relations.divisionLinks
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
        (data.divisionDirectories
          ? [null, ...data.divisionDirectories]
          : null),

      chunkTitles: [
        {stringsKey: 'misc'},

        ...
          (relations.divisionLinks
            ? relations.divisionLinks.map(groupLink => ({
                stringsKey: 'fromGroup',
                group: groupLink,
              }))
            : [{stringsKey: 'fromAlbum'}]),
      ],

      chunkTitleAccents: [
        null,

        ...
          (relations.divisionLinks
            ? relations.divisionLinks.map(() =>
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
          (relations.dividedAlbumLinks
            ? relations.dividedAlbumLinks.map(albumLinks =>
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
          (relations.dividedAlbumLinks
            ? relations.dividedAlbumLinks.map(albumLinks =>
                albumLinks.map(() => null))
            : [relations.undividedAlbumLinks.map(() => null)]),
      ],
    });
  },
};
