import {getTotalDuration} from '#wiki-data';

export default {
  contentDependencies: [
    'generateListingIndexList',
    'generateListingSidebar',
    'generatePageLayout',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({albumData, trackData, wikiInfo}) => ({
    wikiName: wikiInfo.name,
    numTracks: trackData.length,
    numAlbums: albumData.length,
    totalDuration: getTotalDuration(trackData),
  }),

  relations: (relation, sprawl, listing) => ({
    layout:
      relation('generatePageLayout'),

    sidebar:
      relation('generateListingSidebar', listing),

    list:
      relation('generateListingIndexList', listing),
  }),

  data: (sprawl, listing) => ({
    stringsKey: listing.stringsKey,

    wikiName: sprawl.wikiName,
    numTracks: sprawl.numTracks,
    numAlbums: sprawl.numAlbums,
    totalDuration: sprawl.totalDuration,
  }),

  generate(data, relations, {html, language}) {
    return relations.layout.slots({
      title: language.$(data.stringsKey, 'title'),

      headingMode: 'static',

      mainContent: [
        html.tag('p',
          language.$(data.stringsKey, 'infoLine', {
            wiki: data.wikiName,

            tracks:
              html.tag('b',
                language.countTracks(data.numTracks, {unit: true})),

            albums:
              html.tag('b',
                language.countAlbums(data.numAlbums, {unit: true})),

            duration:
              html.tag('b',
                language.formatDuration(data.totalDuration, {
                  approximate: true,
                  unit: true,
                })),
          })),

        html.tag('hr'),

        html.tag('p',
          language.$(data.stringsKey, 'exploreList')),

        relations.list.slot('mode', 'content'),
      ],

      navLinkStyle: 'hierarchical',
      navLinks: [
        {auto: 'home'},
        {auto: 'current'},
      ],

      leftSidebar: relations.sidebar,
    });
  },
};
