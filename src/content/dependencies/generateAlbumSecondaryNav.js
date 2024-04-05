import {sortChronologically} from '#sort';
import {atOffset, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generatePreviousNextLinks',
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
      album.groups
        .map(group => relation('linkGroup', group));

    relations.colorStyles =
      album.groups
        .map(group => relation('generateColorStyleAttribute', group.color));

    if (album.date) {
      relations.previousNextLinks =
        stitchArrays({
          previousAlbum: query.groupPreviousAlbum,
          nextAlbum: query.groupNextAlbum
        }).map(({previousAlbum, nextAlbum}) =>
            (previousAlbum || nextAlbum
              ? relation('generatePreviousNextLinks')
              : null));

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
    const navLinksShouldShowPreviousNext =
      (slots.mode === 'track'
        ? Array.from(relations.previousNextLinks ?? [], () => false)
        : stitchArrays({
            previousAlbumLink: relations.previousAlbumLinks ?? null,
            nextAlbumLink: relations.nextAlbumLinks ?? null,
          }).map(({previousAlbumLink, nextAlbumLink}) =>
              previousAlbumLink ||
              nextAlbumLink));

    const navLinkPreviousNextLinks =
      stitchArrays({
        showPreviousNext: navLinksShouldShowPreviousNext,
        previousNextLinks: relations.previousNextLinks ?? null,
        previousAlbumLink: relations.previousAlbumLinks ?? null,
        nextAlbumLink: relations.nextAlbumLinks ?? null,
      }).map(({
          showPreviousNext,
          previousNextLinks,
          previousAlbumLink,
          nextAlbumLink,
        }) =>
          (showPreviousNext
            ? previousNextLinks.slots({
                previousLink: previousAlbumLink,
                nextLink: nextAlbumLink,
                id: false,
              })
            : null));

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

          previousNextLinks &&
            `(${language.formatUnitList(previousNextLinks.content)})`,
        ]);

    const navLinks =
      stitchArrays({
        content: navLinkContents,
        colorStyle: relations.colorStyles,
      }).map(({content, colorStyle}, index) =>
          html.tag('span', {class: 'nav-link'},
            index > 0 &&
              {class: 'has-divider'},

            colorStyle.slot('context', 'primary-only'),

            content));

    return relations.secondaryNav.slots({
      class: 'nav-links-groups',
      content: navLinks,
    });
  },
};
