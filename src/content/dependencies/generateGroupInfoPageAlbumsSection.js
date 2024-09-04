import {chunkByCondition, groupArray, stitchArrays} from '#sugar';
import {sortChronologically} from '#sort';

export default {
  contentDependencies: [
    'generateContentHeading',
    'generateGroupInfoPageAlbumsSectionAlbumRow',
    'generateGroupInfoPageAlbumsSectionYearHeading',
    'linkGroupGallery',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({lengthClassificationData}) =>
    ({lengthClassificationData}),

  query(sprawl, group) {
    // Typically, a latestFirst: false (default) chronological sort would be
    // appropriate here, but navigation between adjacent albums in a group is a
    // rather "essential" movement or relationship in the wiki, and we consider
    // the sorting order of a group's gallery page (latestFirst: true) to be
    // "canonical" in this regard. We exactly match its sort here, but reverse
    // it, to still present earlier albums preceding later ones.
    const albums =
      sortChronologically(group.albums.slice(), {latestFirst: true})
        .reverse();

    const differentYears =
      (firstDate, secondDate) =>
        firstDate.getFullYear() !== secondDate.getFullYear();

    if (group.divideAlbumListAnnually) {
      const albumsDividedAnnually =
        chunkByCondition(albums,
          ({date: firstDate}, {date: secondDate}) =>
            differentYears(firstDate, secondDate));

      const albumYears =
        albumsDividedAnnually
          .map(([album]) => album.date.getFullYear());

      if (group.divideAlbumListLengthly) {
        const lengthClassifications = sprawl.lengthClassificationData;

        const albumsDividedAnnuallyLengthly =
          albumsDividedAnnually
            .map(albumsThisYear =>
              groupArray(albumsThisYear, album => album.lengthClassification))
            .map(mapThisYear =>
              lengthClassifications
                .map(lengthClassification =>
                  mapThisYear.get(lengthClassification) ?? []));

        return {
          albumsDividedAnnuallyLengthly,
          albumYears,
          lengthClassifications,
        };
      } else {
        const albumsDividedAnnually =
          chunkByCondition(albums,
            ({date: firstDate}, {date: secondDate}) =>
              differentYears(firstDate, secondDate));

        const albumYears =
          albumsDividedAnnually
            .map(([album]) => album.date.getFullYear());

        return {albumsDividedAnnually, albumYears};
      }
    } else if (group.divideAlbumListLengthly) {
      return {};
    } else {
      return {albums};
    }
  },

  relations(relation, query, _sprawl, group) {
    const relations = {};

    relations.contentHeading =
      relation('generateContentHeading');

    relations.yearHeading =
      relation('generateGroupInfoPageAlbumsSectionYearHeading');

    relations.galleryLink =
      relation('linkGroupGallery', group);

    if (group.divideAlbumListAnnually && group.divideAlbumListLengthly) {
      relations.albumRowsDividedAnnuallyLengthly =
        query.albumsDividedAnnuallyLengthly
          .map(albumsDividedLengthly => albumsDividedLengthly
            .map(albums => albums
              .map(album => relation('generateGroupInfoPageAlbumsSectionAlbumRow',
                album,
                group))));
    } else if (group.divideAlbumListAnnually) {
      relations.albumRowsDividedAnnually =
        query.albumsDividedAnnually
          .map(albums => albums
            .map(album =>
              relation('generateGroupInfoPageAlbumsSectionAlbumRow',
                album,
                group)));
    } else if (group.divideAlbumListLengthly) {
    } else {
      relations.albumRows =
        query.albums
          .map(album =>
            relation('generateGroupInfoPageAlbumsSectionAlbumRow',
              album,
              group));
    }

    return relations;
  },

  data(query, _sprawl, group) {
    const data = {};

    data.divideAlbumListAnnually =
      group.divideAlbumListAnnually;

    data.divideAlbumListLengthly =
      group.divideAlbumListLengthly;

    if (group.divideAlbumListAnnually) {
      data.albumDividedYears =
        query.albumYears;
    }

    if (group.divideAlbumListLengthly) {
      data.lengthClassificationNames =
        query.lengthClassifications
          .map(lengthClassification => lengthClassification.name);
    }

    return data;
  },

  generate: (data, relations, {html, language}) =>
    language.encapsulate('groupInfoPage', pageCapsule =>
      language.encapsulate(pageCapsule, 'albumList', listCapsule =>
        html.tags([
          relations.contentHeading.clone()
            .slots({
              tag: 'h2',
              title: language.$(listCapsule, 'title'),
            }),

          html.tag('p',
            {[html.onlyIfSiblings]: true},

            language.encapsulate(pageCapsule, 'viewAlbumGallery', capsule =>
              language.$(capsule, {
                link:
                  relations.galleryLink
                    .slot('content', language.$(capsule, 'link')),
              }))),

          (data.divideAlbumListAnnually && data.divideAlbumListLengthly
            ? stitchArrays({
                year: data.albumDividedYears,
                albumRowsDividedLengthly: relations.albumRowsDividedAnnuallyLengthly,
              }).map(({year, albumRowsDividedLengthly}) => [
                  relations.yearHeading.clone()
                    .slot('year', year),

                  html.tag('dl',
                    stitchArrays({
                      lengthClassificationName: data.lengthClassificationNames,
                      albumRows: albumRowsDividedLengthly,
                    }).map(({lengthClassificationName, albumRows}) =>
                        html.tags([
                          html.tag('dt',
                            {[html.onlyIfSiblings]: true},
                            language.sanitize(lengthClassificationName)),

                          html.tag('dd',
                            {[html.onlyIfContent]: true},
                            html.tag('ul',
                              {[html.onlyIfContent]: true},
                              albumRows.map(albumRow =>
                                albumRow.slots({
                                  showDatetimestamp: false,
                                })))),
                        ]))),
                ])

         : data.divideAlbumListAnnually
            ? data.divideAlbumListLengthly &&
                stitchArrays({
                  year: data.albumDividedYears,
                  albumRows: relations.albumRowsDividedAnnually,
                }).map(({year, albumRows}) => [
                    relations.yearHeading.clone()
                      .slot('year', year),

                    html.tag('ul',
                      albumRows.map(albumRow =>
                        albumRow.slots({
                          showDatetimestamp: false,
                        }))),
                  ])

         : data.divideAlbumListLengthly
            ? null

            : html.tag('ul',
                {[html.onlyIfContent]: true},

                relations.albumRows)),
        ]))),
};
