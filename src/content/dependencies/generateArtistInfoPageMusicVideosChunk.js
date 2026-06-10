export default {
  relations: (relation, artist, album, contribs) => ({
    template:
      relation('generateArtistInfoPageChunk', album),

    albumLink:
      relation('linkAlbum', album),

    albumArtistCredit:
      relation('generateArtistCredit', album.artistContribs, []),

    items:
      contribs.map(contribs =>
        relation('generateArtistInfoPageMusicVideosChunkItem',
          artist,
          contribs)),
  }),

  data: (_artist, album, contribs) => ({
    albumDate:
      album.date,

    contribDates:
      contribs
        .flat()
        .map(contrib => contrib.date),
  }),

  generate: (data, relations, {html, language}) =>
    relations.template.slots({
      mode: 'album',

      link:
        language.encapsulate('artistPage.creditList.album', workingCapsule => {
          const creditCapsule = workingCapsule + '.credit';
          const workingOptions = {album: relations.albumLink};

          relations.albumLink.setSlot('showNameDetail', 'accent');

          relations.albumArtistCredit.setSlots({
            normalStringKey: creditCapsule + '.by',
          });

          if (!html.isBlank(relations.albumArtistCredit)) {
            workingCapsule += '.withCredit';
            workingOptions.credit =
              html.tag('span', {class: 'by'},
                relations.albumArtistCredit);
          }

          return language.$(workingCapsule, workingOptions);
        }),

      date: data.albumDate,
      dates: data.contribDates,

      list:
        html.tag('ul', relations.items),
    }),
};
