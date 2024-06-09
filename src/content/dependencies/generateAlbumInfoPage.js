import {sortAlbumsTracksChronologically} from '#sort';
import {empty} from '#sugar';

import getChronologyRelations from '../util/getChronologyRelations.js';

export default {
  contentDependencies: [
    'generateAlbumAdditionalFilesList',
    'generateAlbumBanner',
    'generateAlbumCoverArtwork',
    'generateAlbumNavAccent',
    'generateAlbumReleaseInfo',
    'generateAlbumSecondaryNav',
    'generateAlbumSidebar',
    'generateAlbumSocialEmbed',
    'generateAlbumStyleRules',
    'generateAlbumTrackList',
    'generateChronologyLinks',
    'generateCommentarySection',
    'generateContentHeading',
    'generatePageLayout',
    'linkAlbum',
    'linkAlbumCommentary',
    'linkAlbumGallery',
    'linkArtist',
    'linkTrack',
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, album) {
    const relations = {};
    const sections = relations.sections = {};

    relations.layout =
      relation('generatePageLayout');

    relations.albumStyleRules =
      relation('generateAlbumStyleRules', album, null);

    relations.socialEmbed =
      relation('generateAlbumSocialEmbed', album);

    relations.coverArtistChronologyContributions =
      getChronologyRelations(album, {
        contributions: album.coverArtistContribs ?? [],

        linkArtist: artist => relation('linkArtist', artist),

        linkThing: trackOrAlbum =>
          (trackOrAlbum.album
            ? relation('linkTrack', trackOrAlbum)
            : relation('linkAlbum', trackOrAlbum)),

        getThings(artist) {
          const getDate = thing => thing.coverArtDate ?? thing.date;

          const things = [
            ...artist.albumsAsCoverArtist,
            ...artist.tracksAsCoverArtist,
          ].filter(getDate);

          return sortAlbumsTracksChronologically(things, {getDate});
        },
      });

    relations.albumNavAccent =
      relation('generateAlbumNavAccent', album, null);

    relations.chronologyLinks =
      relation('generateChronologyLinks');

    relations.secondaryNav =
      relation('generateAlbumSecondaryNav', album);

    relations.sidebar =
      relation('generateAlbumSidebar', album, null);

    if (album.hasCoverArt) {
      relations.cover =
        relation('generateAlbumCoverArtwork', album);
    }

    if (album.hasBannerArt) {
      relations.banner =
        relation('generateAlbumBanner', album);
    }

    // Section: Release info

    relations.releaseInfo =
      relation('generateAlbumReleaseInfo', album);

    // Section: Extra links

    const extra = sections.extra = {};

    if (album.tracks.some(t => t.hasUniqueCoverArt)) {
      extra.galleryLink =
        relation('linkAlbumGallery', album);
    }

    if (album.commentary || album.tracks.some(t => t.commentary)) {
      extra.commentaryLink =
        relation('linkAlbumCommentary', album);
    }

    // Section: Track list

    relations.trackList =
      relation('generateAlbumTrackList', album);

    // Section: Additional files

    if (!empty(album.additionalFiles)) {
      const additionalFiles = sections.additionalFiles = {};

      additionalFiles.heading =
        relation('generateContentHeading');

      additionalFiles.additionalFilesList =
        relation('generateAlbumAdditionalFilesList', album, album.additionalFiles);
    }

    // Section: Artist commentary

    if (album.commentary) {
      sections.artistCommentary =
        relation('generateCommentarySection', album.commentary);
    }

    return relations;
  },

  data(album) {
    const data = {};

    data.name = album.name;
    data.color = album.color;

    if (!empty(album.additionalFiles)) {
      data.numAdditionalFiles = album.additionalFiles.length;
    }

    data.dateAddedToWiki = album.dateAddedToWiki;

    return data;
  },

  generate(data, relations, {html, language}) {
    const {sections: sec} = relations;

    return relations.layout
      .slots({
        title: language.$('albumPage.title', {album: data.name}),
        headingMode: 'sticky',

        color: data.color,
        styleRules: [relations.albumStyleRules],

        cover:
          relations.cover
            ?.slots({
              alt: language.$('misc.alt.albumCover'),
            })
            ?? null,

        mainContent: [
          relations.releaseInfo,

          html.tag('p',
            {[html.onlyIfContent]: true},
            {[html.joinChildren]: html.tag('br')},

            [
              sec.additionalFiles &&
                language.$('releaseInfo.additionalFiles.shortcut', {
                  link: html.tag('a',
                    {href: '#additional-files'},
                    language.$('releaseInfo.additionalFiles.shortcut.link')),
                }),

              sec.extra.galleryLink && sec.extra.commentaryLink &&
                language.$('releaseInfo.viewGalleryOrCommentary', {
                  gallery:
                    sec.extra.galleryLink
                      .slot('content', language.$('releaseInfo.viewGalleryOrCommentary.gallery')),
                  commentary:
                    sec.extra.commentaryLink
                      .slot('content', language.$('releaseInfo.viewGalleryOrCommentary.commentary')),
                }),

              sec.extra.galleryLink && !sec.extra.commentaryLink &&
                language.$('releaseInfo.viewGallery', {
                  link:
                    sec.extra.galleryLink
                      .slot('content', language.$('releaseInfo.viewGallery.link')),
                }),

              !sec.extra.galleryLink && sec.extra.commentaryLink &&
                language.$('releaseInfo.viewCommentary', {
                  link:
                    sec.extra.commentaryLink
                      .slot('content', language.$('releaseInfo.viewCommentary.link')),
                }),
            ]),

          relations.trackList,

          html.tag('p',
            {[html.onlyIfContent]: true},
            {[html.joinChildren]: html.tag('br')},

            [
              language.$('releaseInfo.addedToWiki', {
                [language.onlyIfOptions]: ['date'],
                date: language.formatDate(data.dateAddedToWiki),
              }),
            ]),

          sec.additionalFiles && [
            sec.additionalFiles.heading
              .slots({
                attributes: {id: 'additional-files'},
                title: language.$('releaseInfo.additionalFiles.heading'),
              }),

            sec.additionalFiles.additionalFilesList,
          ],

          sec.artistCommentary,
        ],

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

        banner: relations.banner ?? null,
        bannerPosition: 'top',

        secondaryNav: relations.secondaryNav,

        leftSidebar: relations.sidebar,

        socialEmbed: relations.socialEmbed,
      });
  },
};
