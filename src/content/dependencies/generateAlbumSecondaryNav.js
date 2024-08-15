import {sortChronologically} from '#sort';
import {atOffset, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generateNextLink',
    'generatePreviousLink',
    'generateSecondaryNav',
    'linkAlbumDynamically',
    'linkGroup',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  query(album) {
    const query = {};

    query.groups =
      album.groups;

    if (album.date) {
      // Sort by latest first. This matches the sorting order used on group
      // gallery pages, ensuring that previous/next matches moving up/down
      // the gallery. Note that this makes the index offsets "backwards"
      // compared to how latest-last chronological lists are accessed.
      const groupAlbums =
        query.groups.map(group =>
          sortChronologically(
            group.albums.filter(album => album.date),
            {latestFirst: true}));

      const groupCurrentIndex =
        groupAlbums.map(albums =>
          albums.indexOf(album));

      query.groupPreviousAlbum =
        stitchArrays({
          albums: groupAlbums,
          index: groupCurrentIndex,
        }).map(({albums, index}) =>
            atOffset(albums, index, +1));

      query.groupNextAlbum =
        stitchArrays({
          albums: groupAlbums,
          index: groupCurrentIndex,
        }).map(({albums, index}) =>
            atOffset(albums, index, -1));
    }

    return query;
  },

  relations(relation, query, album) {
    const relations = {};

    relations.secondaryNav =
      relation('generateSecondaryNav');

    relations.groupLinks =
      query.groups
        .map(group => relation('linkGroup', group));

    relations.colorStyles =
      query.groups
        .map(group => relation('generateColorStyleAttribute', group.color));

    if (album.date) {
      relations.previousLinks =
        query.groupPreviousAlbum
          .map(() => relation('generatePreviousLink'));

      relations.nextLinks =
        query.groupNextAlbum
          .map(() => relation('generateNextLink'));

      relations.previousAlbumLinks =
        query.groupPreviousAlbum.map(previousAlbum =>
          (previousAlbum
            ? relation('linkAlbumDynamically', previousAlbum)
            : null));

      relations.nextAlbumLinks =
        query.groupNextAlbum.map(nextAlbum =>
          (nextAlbum
            ? relation('linkAlbumDynamically', nextAlbum)
            : null));
    }

    return relations;
  },

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'album',
    },
  },

  generate(relations, slots, {html, language}) {
    const navLinkPreviousNextLinks =
      stitchArrays({
        previousLink: relations.previousLinks ?? null,
        nextLink: relations.nextLinks ?? null,
        previousAlbumLink: relations.previousAlbumLinks ?? null,
        nextAlbumLink: relations.nextAlbumLinks ?? null,
      }).map(({
          previousLink, nextLink,
          previousAlbumLink, nextAlbumLink,
        }) => ({
          previousLink:
            previousLink.slot('link', previousAlbumLink),

          nextLink:
            nextLink.slot('link', nextAlbumLink),
        }))
        .map(({previousLink, nextLink}) =>
          html.tag('span', {class: 'page-nav-links'},
            {[html.onlyIfContent]: true},

            language.$('albumPage.secondaryNav.groupNavAccent', {
              [language.onlyIfOptions]: ['links'],

              links:
                html.tags(
                  ([previousLink, nextLink])
                    .map(link =>
                      html.tag('span',
                        {[html.onlyIfContent]: true},
                        link.slot('id', false))),
                  {[html.joinChildren]: ' '}),
            })));

    for (const groupLink of relations.groupLinks) {
      groupLink.setSlot('color', false);
    }

    const navLinkContents =
      stitchArrays({
        groupLink: relations.groupLinks,
        previousNextLinks: navLinkPreviousNextLinks,
      }).map(({groupLink, previousNextLinks}) => [
          language.$('albumSidebar.groupBox.title', {
            group: groupLink,
          }),

          slots.mode === 'album' &&
            previousNextLinks,
        ]);

    const navLinks =
      stitchArrays({
        content: navLinkContents,
        colorStyle: relations.colorStyles,
      }).map(({content, colorStyle}) =>
          html.tag('span',
            colorStyle.slot('context', 'primary-only'),

            content));

    return relations.secondaryNav.slots({
      class: [
        'album-secondary-nav',

        slots.mode === 'track' &&
          'page-nav-links',

        slots.mode === 'album' &&
          'with-previous-next',
      ],

      content: navLinks,
    });
  },
};
