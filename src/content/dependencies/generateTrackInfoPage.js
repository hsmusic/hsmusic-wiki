import getChronologyRelations from '../util/getChronologyRelations.js';
import {sortAlbumsTracksChronologically} from '../../util/wiki-data.js';

export default {
  contentDependencies: [
    'generateTrackInfoPageContent',
    'generateAlbumNavLinks',
    'generateAlbumSidebar',
    'generateAlbumStyleRules',
    'generateColorStyleRules',
    'generatePageLayout',
    'linkAlbum',
    'linkTrack',
    'generateChronologyLinks',
  ],

  extraDependencies: ['language'],

  relations(relation, track) {
    return {
      layout: relation('generatePageLayout'),
      chronologyLinks: relation('generateChronologyLinks'),

      artistChronologyContributions: getChronologyRelations(track, {
        contributions: [...track.artistContribs, ...track.contributorContribs],

        linkArtist: artist => relation('linkArtist', artist),
        linkThing: track => relation('linkTrack', track),

        getThings: artist =>
          sortAlbumsTracksChronologically([
            ...artist.tracksAsArtist,
            ...artist.tracksAsContributor,
          ]),
      }),

      coverArtistChronologyContributions: getChronologyRelations(track, {
        contributions: track.coverArtistContribs,

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

      albumLink: relation('linkAlbum', track.album),
      trackLink: relation('linkTrack', track),
      albumNavLinks: relation('generateAlbumNavLinks', track.album, track),

      content: relation('generateTrackInfoPageContent', track),
      sidebar: relation('generateAlbumSidebar', track.album, track),
      albumStyleRules: relation('generateAlbumStyleRules', track.album),
      colorStyleRules: relation('generateColorStyleRules', track.color),
    };
  },

  data(track) {
    return {
      name: track.name,

      hasTrackNumbers: track.album.hasTrackNumbers,
      trackNumber: track.album.tracks.indexOf(track) + 1,
    };
  },

  generate(data, relations, {language}) {
    return relations.layout
      .slots({
        title: language.$('trackPage.title', {track: data.name}),
        styleRules: [
          relations.albumStyleRules,
          relations.colorStyleRules,
        ],

        cover: relations.content.cover,
        mainContent: relations.content.main.content,

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {html: relations.albumLink},
          {
            html:
              (data.hasTrackNumbers
                ? language.$('trackPage.nav.track.withNumber', {
                    number: data.trackNumber,
                    track: relations.trackLink
                      .slot('attributes', {class: 'current'}),
                  })
                : language.$('trackPage.nav.track', {
                    track: relations.trackLink
                      .slot('attributes', {class: 'current'}),
                  })),
          },
        ],

        navBottomRowContent:
          relations.albumNavLinks.slots({
            showTrackNavigation: true,
            showExtraLinks: false,
          }),

        navContent:
          relations.chronologyLinks.slots({
            chronologyInfoSets: [
              {
                headingString: 'misc.chronology.heading.track',
                contributions: relations.artistChronologyContributions,
              },
              {
                headingString: 'misc.chronology.heading.coverArt',
                contributions: relations.coverArtistChronologyContributions,
              },
            ],
          }),

        ...relations.sidebar,
      });
  },
}
