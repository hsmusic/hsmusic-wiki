import getChronologyRelations from '../util/getChronologyRelations.js';
import {sortAlbumsTracksChronologically} from '../../util/wiki-data.js';

export default {
  contentDependencies: [
    'generateAlbumInfoPageContent',
    'generateAlbumNavAccent',
    'generateAlbumSidebar',
    'generateAlbumSocialEmbed',
    'generateAlbumStyleRules',
    'generateChronologyLinks',
    'generateColorStyleRules',
    'generatePageLayout',
    'linkAlbum',
    'linkArtist',
    'linkTrack',
  ],

  extraDependencies: ['language'],

  relations(relation, album) {
    return {
      layout: relation('generatePageLayout'),

      coverArtistChronologyContributions: getChronologyRelations(album, {
        contributions: album.coverArtistContribs,

        linkArtist: artist => relation('linkArtist', artist),

        linkThing: trackOrAlbum =>
          (trackOrAlbum.album
            ? relation('linkTrack', trackOrAlbum)
            : relation('linkAlbum', trackOrAlbum)),

        getThings: artist =>
          sortAlbumsTracksChronologically([
            ...artist.albumsAsCoverArtist,
            ...artist.tracksAsCoverArtist,
          ]),
      }),

      albumNavAccent: relation('generateAlbumNavAccent', album, null),
      chronologyLinks: relation('generateChronologyLinks'),

      content: relation('generateAlbumInfoPageContent', album),
      sidebar: relation('generateAlbumSidebar', album, null),
      socialEmbed: relation('generateAlbumSocialEmbed', album),
      albumStyleRules: relation('generateAlbumStyleRules', album),
      colorStyleRules: relation('generateColorStyleRules', album.color),
    };
  },

  data(album) {
    return {
      name: album.name,
    };
  },

  generate(data, relations, {language}) {
    return relations.layout
      .slots({
        title: language.$('albumPage.title', {album: data.name}),
        headingMode: 'sticky',

        styleRules: [
          relations.albumStyleRules,
          relations.colorStyleRules,
        ],

        cover: relations.content.cover,
        mainContent: relations.content.main.content,

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {
            auto: 'current',
            accent:
              relations.albumNavAccent.slots({
                showTrackNavigation: true,
                showExtraLinks: true,
              }),
          },
        ],

        navContent:
          relations.chronologyLinks.slots({
            chronologyInfoSets: [
              {
                headingString: 'misc.chronology.heading.coverArt',
                contributions: relations.coverArtistChronologyContributions,
              },
            ],
          }),

        ...relations.sidebar,

        // socialEmbed: relations.socialEmbed,
      });
  },
};
