import {getTotalDuration} from '../../util/wiki-data.js';

export default {
  contentDependencies: [
    'generateListingIndexList',
    'generateListingSidebar',
    'generatePageLayout',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({albumData, trackData, wikiInfo}) {
    return {
      wikiName: wikiInfo.name,
      numTracks: trackData.length,
      numAlbums: albumData.length,
      totalDuration: getTotalDuration(trackData),
    };
  },

  relations(relation) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.sidebar =
      relation('generateListingSidebar', null);

    relations.list =
      relation('generateListingIndexList', null);

    return relations;
  },

  data(sprawl) {
    return {
      wikiName: sprawl.wikiName,
      numTracks: sprawl.numTracks,
      numAlbums: sprawl.numAlbums,
      totalDuration: sprawl.totalDuration,
    };
  },

  generate(data, relations, {html, language}) {
    return relations.layout.slots({
      title: language.$('listingIndex.title'),

      headingMode: 'static',

      mainContent: [
        html.tag('p',
          language.$('listingIndex.infoLine', {
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
          language.$('listingIndex.exploreList')),

        relations.list.slot('mode', 'content'),
      ],

      navLinkStyle: 'hierarchical',
      navLinks: [
        {auto: 'home'},
        {auto: 'current'},
      ],

      ...relations.sidebar,
    });
  },
};
