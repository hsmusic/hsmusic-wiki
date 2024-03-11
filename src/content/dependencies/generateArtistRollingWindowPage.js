import {sortAlbumsTracksChronologically} from '#sort';
import Thing from '#thing';

import {
  chunkByConditions,
  filterMultipleArrays,
  empty,
  sortMultipleArrays,
  stitchArrays,
  unique,
} from '#sugar';

export default {
  contentDependencies: [
    'image',
    'generateArtistNavLinks',
    'generateCoverGrid',
    'generatePageLayout',
    'linkAlbum',
    'linkFlash',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({groupCategoryData}) => ({
    groupCategoryData,
  }),

  query(sprawl, artist) {
    const query = {};

    const musicContributions =
      artist.musicContributions
        .filter(contrib => contrib.date);

    const artworkContributions =
      artist.artworkContributions
        .filter(contrib =>
          contrib.date &&
          contrib.thingProperty !== 'wallpaperArtistContribs' &&
          contrib.thingProperty !== 'bannerArtistContribs');

    const musicThings =
      musicContributions
        .map(contrib => contrib.thing);

    const artworkThings =
      artworkContributions
        .map(contrib => contrib.thing);

    const musicContributionDates =
      musicContributions
        .map(contrib => contrib.date);

    const artworkContributionDates =
      artworkContributions
        .map(contrib => contrib.date);

    const musicContributionKinds =
      musicContributions
        .map(() => 'music');

    const artworkContributionKinds =
      artworkContributions
        .map(() => 'artwork');

    const allThings = [
      ...artworkThings,
      ...musicThings,
    ];

    const allContributionDates = [
      ...artworkContributionDates,
      ...musicContributionDates,
    ];

    const allContributionKinds = [
      ...artworkContributionKinds,
      ...musicContributionKinds,
    ];

    const sortedThings =
      sortAlbumsTracksChronologically(allThings.slice(), {latestFirst: true});

    sortMultipleArrays(
      allThings,
      allContributionDates,
      allContributionKinds,
      (thing1, thing2) =>
        sortedThings.indexOf(thing1) -
        sortedThings.indexOf(thing2));

    const sourceIndices =
      Array.from({length: allThings.length}, (_, i) => i);

    const sourceChunks =
      chunkByConditions(sourceIndices, [
        (index1, index2) =>
          allThings[index1] !==
          allThings[index2],
      ]);

    const indicesTo = array => index => array[index];

    query.things =
      sourceChunks
        .map(chunks => allThings[chunks[0]]);

    query.thingGroups =
      query.things.map(thing =>
        (thing.constructor[Thing.referenceType] === 'album'
          ? thing.groups
       : thing.constructor[Thing.referenceType] === 'track'
          ? thing.album.groups
          : null));

    query.thingContributionDates =
      sourceChunks
        .map(indices => indices
          .map(indicesTo(allContributionDates)));

    query.thingContributionKinds =
      sourceChunks
        .map(indices => indices
          .map(indicesTo(allContributionKinds)));

    // Matches the "kind" dropdown.
    const kinds = ['artwork', 'music', 'flash'];

    const allKinds =
      unique(query.thingContributionKinds.flat(2));

    query.kinds =
      kinds
        .filter(kind => allKinds.includes(kind));

    query.firstKind =
      query.kinds.at(0);

    const allGroups =
      unique(query.thingGroups.flat());

    query.groupCategories =
      sprawl.groupCategoryData.slice();

    query.groupCategoryGroups =
      sprawl.groupCategoryData
        .map(category => category.groups
          .filter(group => allGroups.includes(group)));

    filterMultipleArrays(
      query.groupCategories,
      query.groupCategoryGroups,
      (_category, groups) => !empty(groups));

    const groupsMatchingFirstKind =
      unique(
        stitchArrays({
          thing: query.things,
          groups: query.thingGroups,
          kinds: query.thingContributionKinds,
        }).filter(({kinds}) => kinds.includes(query.firstKind))
          .flatMap(({groups}) => groups));

    query.firstGroup =
      sprawl.groupCategoryData
        .flatMap(category => category.groups)
        .find(group => groupsMatchingFirstKind.includes(group));

    query.firstGroupCategory =
      query.firstGroup.category;

    return query;
  },

  relations: (relation, query, sprawl, artist) => ({
    layout:
      relation('generatePageLayout'),

    artistNavLinks:
      relation('generateArtistNavLinks', artist),

    sourceGrid:
      relation('generateCoverGrid'),

    sourceGridImages:
      query.things.map(() => relation('image')),

    sourceGridLinks:
      query.things.map(thing =>
        (thing.constructor[Thing.referenceType] === 'album'
          ? relation('linkAlbum', thing)
       : thing.constructor[Thing.referenceType] === 'track'
          ? relation('linkTrack', thing)
       : thing.constructor[Thing.referenceType] === 'flash'
          ? relation('linkFlash', thing)
          : null)),
  }),

  data: (query, sprawl, artist) => ({
    name:
      artist.name,

    categoryGroupDirectories:
      query.groupCategoryGroups
        .map(groups => groups
          .map(group => group.directory)),

    categoryGroupNames:
      query.groupCategoryGroups
        .map(groups => groups
          .map(group => group.name)),

    firstGroupCategoryIndex:
      query.groupCategories
        .indexOf(query.firstGroupCategory),

    firstGroupIndex:
      stitchArrays({
        category: query.groupCategories,
        groups: query.groupCategoryGroups,
      }).find(({category}) => category === query.firstGroupCategory)
        .groups
          .indexOf(query.firstGroup),

    kinds:
      query.kinds,

    sourceGridNames:
      query.things
        .map(thing => thing.name),

    sourceGridGroupDirectories:
      query.thingGroups
        .map(groups => groups
          .map(group => group.directory)),

    sourceGridGroupNames:
      query.thingGroups
        .map(groups => groups
          .map(group => group.name)),

    sourceGridPaths:
      query.things.map(thing =>
         (thing.constructor[Thing.referenceType] === 'album' && thing.hasCoverArt
           ? ['media.albumCover', thing.directory, thing.coverArtFileExtension]
        : thing.constructor[Thing.referenceType] === 'track'
           ? (thing.hasUniqueCoverArt
               ? ['media.trackCover', thing.album.directory, thing.directory, thing.coverArtFileExtension]
            : thing.album.hasCoverArt
               ? ['media.albumCover', thing.album.directory, thing.album.coverArtFileExtension]
               : null)
        : thing.constructor[Thing.referenceType] === 'flash'
           ? ['media.flashCover', thing.directory, thing.coverArtFileExtension]
           : null)),

    sourceGridContributionKinds:
      query.thingContributionKinds,

    sourceGridContributionDates:
      query.thingContributionDates,
  }),

  generate: (data, relations, {html, language}) =>
    relations.layout.slots({
      title:
        language.$('artistRollingWindowPage.title', {
          artist: data.name,
        }),

      mainClasses: ['top-index'],
      mainContent: [
        html.tag('p', {id: 'timeframe-configuration'},
          language.$('artistRollingWindowPage.windowConfigurationLine', {
            timeBefore:
              language.$('artistRollingWindowPage.timeframe.months', {
                input:
                  html.tag('input', {id: 'timeframe-months-before'},
                    {type: 'number'},
                    {value: 3, min: 0}),
              }),

            timeAfter:
              language.$('artistRollingWindowPage.timeframe.months', {
                input:
                  html.tag('input', {id: 'timeframe-months-after'},
                    {type: 'number'},
                    {value: 3, min: 1}),
              }),

            peek:
              language.$('artistRollingWindowPage.timeframe.months', {
                input:
                  html.tag('input', {id: 'timeframe-months-peek'},
                    {type: 'number'},
                    {value: 1, min: 0}),
              }),
          })),

        html.tag('p', {id: 'contribution-configuration'},
          language.$('artistRollingWindowPage.contributionConfigurationLine', {
            kind:
              html.tag('select', {id: 'contribution-kind'},
                data.kinds.map(kind =>
                  html.tag('option', {value: kind},
                    language.$('artistRollingWindowPage.contributionKind', kind)))),

            group:
              html.tag('select', {id: 'contribution-group'}, [
                html.tag('option', {value: '-'},
                  language.$('artistRollingWindowPage.contributionGroup.all')),

                stitchArrays({
                  names: data.categoryGroupNames,
                  directories: data.categoryGroupDirectories,
                }).map(({names, directories}, categoryIndex) => [
                    html.tag('hr'),

                    stitchArrays({name: names, directory: directories})
                      .map(({name, directory}, groupIndex) =>
                        html.tag('option', {value: directory},
                          categoryIndex === data.firstGroupCategoryIndex &&
                          groupIndex === data.firstGroupIndex &&
                            {selected: true},

                          language.$('artistRollingWindowPage.contributionGroup.group', {
                            group: name,
                          }))),
                  ]),
              ]),
          })),

        html.tag('p', {id: 'timeframe-selection-info'}, [
          html.tag('span', {id: 'timeframe-selection-some'},
            {style: 'display: none'},

            language.$('artistRollingWindowPage.timeframeSelectionLine', {
              contributions:
                html.tag('b', {id: 'timeframe-selection-contribution-count'}),

              timeframes:
                html.tag('b', {id: 'timeframe-selection-timeframe-count'}),

              firstDate:
                html.tag('b', {id: 'timeframe-selection-first-date'}),

              lastDate:
                html.tag('b', {id: 'timeframe-selection-last-date'}),
            })),

          html.tag('span', {id: 'timeframe-selection-none'},
            {style: 'display: none'},
            language.$('artistRollingWindowPage.timeframeSelectionLine.none')),
        ]),

        html.tag('p', {id: 'timeframe-selection-control'},
          {style: 'display: none'},

          language.$('artistRollingWindowPage.timeframeSelectionControl', {
            timeframes:
              html.tag('select', {id: 'timeframe-selection-menu'}),

            previous:
              html.tag('a', {id: 'timeframe-selection-previous'},
                {href: '#'},
                language.$('artistRollingWindowPage.timeframeSelectionControl.previous')),

            next:
              html.tag('a', {id: 'timeframe-selection-next'},
                {href: '#'},
                language.$('artistRollingWindowPage.timeframeSelectionControl.next')),
          })),

        html.tag('div', {id: 'timeframe-source-area'}, [
          html.tag('p', {id: 'timeframe-empty'},
            {style: 'display: none'},
            language.$('artistRollingWindowPage.emptyTimeframeLine')),

          relations.sourceGrid.slots({
            attributes: {style: 'display: none'},

            lazy: true,

            links:
              relations.sourceGridLinks.map(link =>
                link.slot('attributes', {target: '_blank'})),

            names:
              data.sourceGridNames,

            images:
              stitchArrays({
                image: relations.sourceGridImages,
                path: data.sourceGridPaths,
              }).map(({image, path}) =>
                  image.slot('path', path)),

            info:
              stitchArrays({
                contributionKinds: data.sourceGridContributionKinds,
                contributionDates: data.sourceGridContributionDates,
                groupDirectories: data.sourceGridGroupDirectories,
                groupNames: data.sourceGridGroupNames,
              }).map(({
                  contributionKinds,
                  contributionDates,
                  groupDirectories,
                  groupNames,
                }) => [
                  stitchArrays({
                    directory: groupDirectories,
                    name: groupNames,
                  }).map(({directory, name}) =>
                    html.tag('data', {class: 'contribution-group'},
                      {value: directory},
                      name)),

                  stitchArrays({
                    kind: contributionKinds,
                    date: contributionDates,
                  }).map(({kind, date}) =>
                      html.tag('time', {class: `${kind}-contribution-date`},
                        {datetime: date.toUTCString()},
                        language.formatDate(date))),
                ]),
          }),
        ]),
      ],

      navLinkStyle: 'hierarchical',
      navLinks:
        relations.artistNavLinks
          .slots({
            showExtraLinks: true,
            currentExtra: 'rolling-window',
          })
          .content,
    }),
}
