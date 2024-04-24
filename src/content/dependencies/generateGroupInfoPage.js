import {sortAlbumsTracksChronologically} from '#sort';
import {chunkByProperties, empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAbsoluteDatetimestamp',
    'generateColorStyleAttribute',
    'generateContentHeading',
    'generateGroupNavLinks',
    'generateGroupSecondaryNav',
    'generateGroupSidebar',
    'generatePageLayout',
    'linkAlbum',
    'linkExternal',
    'linkGroupGallery',
    'linkGroup',
    'linkTrack',
    'transformContent',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({wikiInfo}) {
    return {
      enableGroupUI: wikiInfo.enableGroupUI,
    };
  },

  query(sprawl, group) {
    const albums =
      group.albums;

    const albumGroups =
      albums
        .map(album => album.groups);

    const albumOtherCategory =
      albumGroups
        .map(groups => groups
          .map(group => group.category)
          .find(category => category !== group.category));

    const albumOtherGroups =
      stitchArrays({
        groups: albumGroups,
        category: albumOtherCategory,
      }).map(({groups, category}) =>
          groups
            .filter(group => group.category === category));

    const guestTracks =
      sortAlbumsTracksChronologically(
        group.guestTracks.slice());

    // TODO: Chunking by exact date might not be super ideal
    // when we're only primarily displaying the year.
    const guestTrackChunks =
      chunkByProperties(
        guestTracks,
        ['album', 'date']);

    const guestTrackChunkAlbums =
      guestTrackChunks
        .map(({album}) => album);

    const guestTrackChunkGroupCategories =
      guestTrackChunkAlbums
        .map(album =>
          (empty(album.groups)
            ? null
            : album.groups[0].category));

    const guestTrackChunkGroups =
      stitchArrays({
        album: guestTrackChunkAlbums,
        category: guestTrackChunkGroupCategories,
      }).map(({album, category}) =>
          album.groups
            .filter(group => group.category === category));

    const guestTrackChunkDates =
      guestTrackChunks
        .map(({date}) => date);

    const guestTrackChunkTracks =
      guestTrackChunks
        .map(({chunk}) => chunk);

    return {
      albums,
      albumOtherGroups,
      guestTrackChunkAlbums,
      guestTrackChunkGroups,
      guestTrackChunkDates,
      guestTrackChunkTracks,
    };
  },

  relations(relation, query, sprawl, group) {
    const relations = {};
    const sec = relations.sections = {};

    relations.layout =
      relation('generatePageLayout');

    relations.navLinks =
      relation('generateGroupNavLinks', group);

    if (sprawl.enableGroupUI) {
      relations.secondaryNav =
        relation('generateGroupSecondaryNav', group);

      relations.sidebar =
        relation('generateGroupSidebar', group);
    }

    sec.info = {};

    if (!empty(group.urls)) {
      sec.info.visitLinks =
        group.urls
          .map(url => relation('linkExternal', url));
    }

    if (group.description) {
      sec.info.description =
        relation('transformContent', group.description);
    }

    if (!empty(query.albums)) {
      sec.albums = {};

      sec.albums.heading =
        relation('generateContentHeading');

      sec.albums.galleryLink =
        relation('linkGroupGallery', group);

      sec.albums.albumColorStyles =
        query.albums
          .map(album => relation('generateColorStyleAttribute', album.color));

      sec.albums.albumLinks =
        query.albums
          .map(album => relation('linkAlbum', album));

      sec.albums.otherGroupLinks =
        query.albumOtherGroups
          .map(groups => groups
            .map(group => relation('linkGroup', group)));

      sec.albums.datetimestamps =
        group.albums.map(album =>
          (album.date
            ? relation('generateAbsoluteDatetimestamp', album.date)
            : null));
    }

    if (!empty(query.guestTrackChunkTracks)) {
      sec.guestTracks = {};

      sec.guestTracks.heading =
        relation('generateContentHeading');

      sec.guestTracks.chunkAlbumLinks =
        query.guestTrackChunkAlbums
          .map(album => relation('linkAlbum', album));

      sec.guestTracks.chunkColorStyles =
        query.guestTrackChunkAlbums
          .map(album => relation('generateColorStyleAttribute', album.color));

      sec.guestTracks.chunkDatetimestamps =
        query.guestTrackChunkDates
          .map(date =>
            (date
              ? relation('generateAbsoluteDatetimestamp', date)
              : null));

      sec.guestTracks.chunkGroupLinks =
        query.guestTrackChunkGroups
          .map(groups => groups
            .map(group => relation('linkGroup', group)));

      sec.guestTracks.chunkTrackLinks =
        query.guestTrackChunkTracks
          .map(tracks => tracks
            .map(track => relation('linkTrack', track)));
    }

    return relations;
  },

  data(query, sprawl, group) {
    const data = {};

    data.name = group.name;
    data.color = group.color;

    return data;
  },

  generate(data, relations, {html, language}) {
    const {sections: sec} = relations;

    return relations.layout
      .slots({
        title: language.$('groupInfoPage.title', {group: data.name}),
        headingMode: 'sticky',
        color: data.color,

        mainContent: [
          sec.info.visitLinks &&
            html.tag('p',
              language.$('releaseInfo.visitOn', {
                links:
                  language.formatDisjunctionList(
                    sec.info.visitLinks
                      .map(link => link.slot('context', 'group'))),
              })),

          html.tag('blockquote',
            {[html.onlyIfContent]: true},
            sec.info.description
              ?.slot('mode', 'multiline')),

          sec.albums && [
            sec.albums.heading
              .slots({
                tag: 'h2',
                title: language.$('groupInfoPage.albumList.title'),
              }),

            html.tag('p',
              language.$('groupInfoPage.viewAlbumGallery', {
                link:
                  sec.albums.galleryLink
                    .slot('content', language.$('groupInfoPage.viewAlbumGallery.link')),
              })),

            html.tag('ul',
              stitchArrays({
                albumLink: sec.albums.albumLinks,
                otherGroupLinks: sec.albums.otherGroupLinks,
                datetimestamp: sec.albums.datetimestamps,
                albumColorStyle: sec.albums.albumColorStyles,
              }).map(({
                  albumLink,
                  otherGroupLinks,
                  datetimestamp,
                  albumColorStyle,
                }) => {
                  const prefix = 'groupInfoPage.albumList.item';
                  const parts = [prefix];
                  const options = {};

                  options.album =
                    albumLink.slot('color', false);

                  if (datetimestamp) {
                    parts.push('withYear');
                    options.yearAccent =
                      language.$(prefix, 'yearAccent', {
                        year:
                          datetimestamp.slots({style: 'year', tooltip: true}),
                      });
                  }

                  if (!empty(otherGroupLinks)) {
                    parts.push('withOtherGroup');
                    options.otherGroupAccent =
                      html.tag('span', {class: 'other-group-accent'},
                        language.$(prefix, 'otherGroupAccent', {
                          groups:
                            language.formatConjunctionList(
                              otherGroupLinks.map(groupLink =>
                                groupLink.slot('color', false))),
                        }));
                  }

                  return (
                    html.tag('li',
                      albumColorStyle,
                      language.$(...parts, options)));
                })),
          ],

          sec.guestTracks && [
            sec.guestTracks.heading
              .slots({
                tag: 'h2',
                title: language.$('groupInfoPage.guestTrackList.title'),
              }),

            html.tag('p',
              language.$('groupInfoPage.guestTrackList.infoLine')),

            html.tag('dl', {class: 'guest-track-list'},
              stitchArrays({
                albumLink: sec.guestTracks.chunkAlbumLinks,
                colorStyle: sec.guestTracks.chunkColorStyles,
                groupLinks: sec.guestTracks.chunkGroupLinks,
                datetimestamp: sec.guestTracks.chunkDatetimestamps,
                trackLinks: sec.guestTracks.chunkTrackLinks,
              }).map(({
                  albumLink,
                  colorStyle,
                  groupLinks,
                  datetimestamp,
                  trackLinks,
                }) => {
                  const prefix = 'groupInfoPage.guestTrackList.chunk';

                  const titleParts = [prefix, 'title'];
                  const titleOptions = {album: albumLink};

                  if (datetimestamp) {
                    titleParts.push('withYear');
                    titleOptions.yearAccent =
                      language.$(prefix, 'title.yearAccent', {
                        year:
                          datetimestamp.slots({style: 'year', tooltip: true}),
                      });
                  }

                  if (!empty(groupLinks)) {
                    titleParts.push('withGroups');
                    titleOptions.groupAccent =
                      html.tag('span', {class: 'group-accent'},
                        language.$(prefix, 'title.groupAccent', {
                          groups:
                            language.formatConjunctionList(
                              groupLinks.map(groupLink =>
                                groupLink.slot('color', false))),
                        }));
                  }

                  const dt =
                    html.tag('dt',
                      colorStyle,
                      language.$(...titleParts, titleOptions));

                  const dd =
                    html.tag('dd',
                      html.tag('ul',
                        trackLinks.map(trackLink =>
                          html.tag('li',
                            language.$('groupInfoPage.guestTrackList.chunk.item', {
                              track: trackLink,
                            })))));

                  return [dt, dd];
                })),
          ],
        ],

        leftSidebar:
          (relations.sidebar
            ? relations.sidebar
                .content /* TODO: Kludge. */
            : null),

        navLinkStyle: 'hierarchical',
        navLinks: relations.navLinks.content,

        secondaryNav: relations.secondaryNav ?? null,
      });
  },
};
