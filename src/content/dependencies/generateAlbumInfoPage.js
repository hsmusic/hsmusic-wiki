import getChronologyRelations from '../util/getChronologyRelations.js';
import {sortAlbumsTracksChronologically} from '../../util/wiki-data.js';
import {accumulateSum, empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateAdditionalFilesShortcut',
    'generateAlbumAdditionalFilesList',
    'generateAlbumCoverArtwork',
    'generateAlbumNavAccent',
    'generateAlbumSidebar',
    'generateAlbumSocialEmbed',
    'generateAlbumStyleRules',
    'generateAlbumTrackList',
    'generateChronologyLinks',
    'generateColorStyleRules',
    'generateContentHeading',
    'generatePageLayout',
    'generateReleaseInfoContributionsLine',
    'linkAlbum',
    'linkAlbumCommentary',
    'linkAlbumGallery',
    'linkArtist',
    'linkExternal',
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
      relation('generateAlbumStyleRules', album);

    relations.colorStyleRules =
      relation('generateColorStyleRules', album.color);

    relations.socialEmbed =
      relation('generateAlbumSocialEmbed', album);

    relations.coverArtistChronologyContributions =
      getChronologyRelations(album, {
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
      });

    relations.albumNavAccent =
      relation('generateAlbumNavAccent', album, null);

    relations.chronologyLinks =
      relation('generateChronologyLinks');

    relations.sidebar =
      relation('generateAlbumSidebar', album, null);

    if (album.hasCoverArt) {
      relations.cover =
        relation('generateAlbumCoverArtwork', album);
    }

    // Section: Release info

    const releaseInfo = sections.releaseInfo = {};

    releaseInfo.artistContributionsLine =
      relation('generateReleaseInfoContributionsLine', album.artistContribs);

    releaseInfo.coverArtistContributionsLine =
      relation('generateReleaseInfoContributionsLine', album.coverArtistContribs);

    releaseInfo.wallpaperArtistContributionsLine =
      relation('generateReleaseInfoContributionsLine', album.wallpaperArtistContribs);

    releaseInfo.bannerArtistContributionsLine =
      relation('generateReleaseInfoContributionsLine', album.bannerArtistContribs);

    // Section: Listen on

    if (!empty(album.urls)) {
      const listen = sections.listen = {};

      listen.externalLinks =
        album.urls.map(url =>
          relation('linkExternal', url));
    }

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

    if (!empty(album.additionalFiles)) {
      extra.additionalFilesShortcut =
        relation('generateAdditionalFilesShortcut', album.additionalFiles);
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
      const artistCommentary = sections.artistCommentary = {};

      artistCommentary.heading =
        relation('generateContentHeading');

      artistCommentary.content =
        relation('transformContent', album.commentary);
    }

    return relations;
  },

  data(album) {
    const data = {};

    data.name = album.name;
    data.date = album.date;

    data.duration = accumulateSum(album.tracks, track => track.duration);
    data.durationApproximate = album.tracks.length > 1;

    if (album.coverArtDate && +album.coverArtDate !== +album.date) {
      data.coverArtDate = album.coverArtDate;
    }

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

        colorStyleRules: [relations.colorStyleRules],
        additionalStyleRules: [relations.albumStyleRules],

        cover:
          (relations.cover
            ? relations.cover.slots({
                alt: language.$('misc.alt.albumCover'),
              })
            : null),

        mainContent: [
          html.tag('p',
            {
              [html.onlyIfContent]: true,
              [html.joinChildren]: html.tag('br'),
            },
            [
              sec.releaseInfo.artistContributionsLine
                .slots({stringKey: 'releaseInfo.by'}),

              sec.releaseInfo.coverArtistContributionsLine
                .slots({stringKey: 'releaseInfo.coverArtBy'}),

              sec.releaseInfo.wallpaperArtistContributionsLine
                .slots({stringKey: 'releaseInfo.wallpaperArtBy'}),

              sec.releaseInfo.bannerArtistContributionsLine
                .slots({stringKey: 'releasInfo.bannerArtBy'}),

              data.date &&
                language.$('releaseInfo.released', {
                  date: language.formatDate(data.date),
                }),

              data.coverArtDate &&
                language.$('releaseInfo.artReleased', {
                  date: language.formatDate(data.coverArtDate),
                }),

              data.duration &&
                language.$('releaseInfo.duration', {
                  duration:
                    language.formatDuration(data.duration, {
                      approximate: data.durationApproximate,
                    }),
                }),
            ]),

          sec.listen &&
            html.tag('p',
              language.$('releaseInfo.listenOn', {
                links:
                  language.formatDisjunctionList(
                    sec.listen.externalLinks
                      .map(link => link.slot('mode', 'album'))),
              })),

          html.tag('p',
            {
              [html.onlyIfContent]: true,
              [html.joinChildren]: html.tag('br'),
            },
            [
              sec.extra.additionalFilesShortcut,

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
            {
              [html.onlyIfContent]: true,
              [html.joinChildren]: '<br>',
            },
            [
              data.dateAddedToWiki &&
                language.$('releaseInfo.addedToWiki', {
                  date: language.formatDate(data.dateAddedToWiki),
                }),
            ]),

          sec.additionalFiles && [
            sec.additionalFiles.heading
              .slots({
                id: 'additional-files',
                title:
                  language.$('releaseInfo.additionalFiles.heading', {
                    additionalFiles:
                      language.countAdditionalFiles(data.numAdditionalFiles, {unit: true}),
                  }),
              }),

            sec.additionalFiles.additionalFilesList,
          ],

          sec.artistCommentary && [
            sec.artistCommentary.heading
              .slots({
                id: 'artist-commentary',
                title: language.$('releaseInfo.artistCommentary')
              }),

            html.tag('blockquote',
              sec.artistCommentary.content
                .slot('mode', 'multiline')),
          ],
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

        ...relations.sidebar,

        // socialEmbed: relations.socialEmbed,
      });
  },
};

/*
  banner: !empty(album.bannerArtistContribs) && {
    dimensions: album.bannerDimensions,
    path: [
      'media.albumBanner',
      album.directory,
      album.bannerFileExtension,
    ],
    alt: language.$('misc.alt.albumBanner'),
    position: 'top',
  },

  secondaryNav: generateAlbumSecondaryNav(album, null, {
    getLinkThemeString,
    html,
    language,
    link,
  }),
*/
