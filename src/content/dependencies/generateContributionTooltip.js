function compareReleaseContributions(a, b) {
  if (a === b) {
    return true;
  }

  const {previous: aPrev, next: aNext} = getSiblings(a);
  const {previous: bPrev, next: bNext} = getSiblings(b);

  const effective = contrib =>
    (contrib?.thing.isAlbum && contrib.thing.style === 'single'
      ? contrib.thing.tracks[0]
      : contrib?.thing);

  return (
    effective(aPrev) === effective(bPrev) &&
    effective(aNext) === effective(bNext)
  );
}

function getSiblings(contribution) {
  let previous = contribution;
  while (previous && previous.thing === contribution.thing) {
    previous = previous.previousBySameArtist;
  }

  let next = contribution;
  while (next && next.thing === contribution.thing) {
    next = next.nextBySameArtist;
  }

  return {previous, next};
}

export default {
  contentDependencies: [
    'generateContributionTooltipChronologySection',
    'generateContributionTooltipExternalLinkSection',
    'generateTooltip',
  ],

  extraDependencies: ['html', 'language'],

  query: (contribution) => ({
    albumArtistContribution:
      (contribution.thing.isTrack
        ? contribution.thing.album.artistContribs
            .find(artistContrib => artistContrib.artist === contribution.artist)
        : null),
  }),

  relations: (relation, query, contribution) => ({
    tooltip:
      relation('generateTooltip'),

    externalLinkSection:
      relation('generateContributionTooltipExternalLinkSection', contribution),

    ownChronologySection:
      relation('generateContributionTooltipChronologySection', contribution),

    artistReleaseChronologySection:
      (query.albumArtistContribution
        ? relation('generateContributionTooltipChronologySection',
            query.albumArtistContribution)
        : null),
  }),

  data: (query, contribution) => ({
    artistName:
      contribution.artist.name,

    isAlbumArtistContribution:
      contribution.thing.isAlbum &&
      contribution.thingProperty === 'artistContribs',

    isSingleFirstTrackArtistContribution:
      contribution.thing.isTrack &&
      contribution.thingProperty === 'artistContribs' &&
      contribution.thing.album.style === 'single' &&
      contribution.thing.album.tracks[0] === contribution.thing,

    artistReleaseChronologySectionDiffers:
      (query.albumArtistContribution
        ? !compareReleaseContributions(contribution, query.albumArtistContribution)
        : null),
  }),

  slots: {
    showExternalLinks: {type: 'boolean'},
    showChronology: {type: 'boolean'},

    chronologyKind: {type: 'string'},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('misc.artistLink', capsule =>
      relations.tooltip.slots({
        attributes:
          {class: 'contribution-tooltip'},

        contentAttributes: {
          [html.joinChildren]:
            html.tag('span', {class: 'tooltip-divider'}),
        },

        content: [
          slots.showExternalLinks &&
            relations.externalLinkSection,

          slots.showChronology &&
            language.encapsulate(capsule, 'chronology', capsule => {
              const chronologySections = [];

              if (data.isAlbumArtistContribution) {
                relations.ownChronologySection.setSlots({
                  kind: 'release',
                  heading:
                    language.$(capsule, 'heading.artistReleases', {
                      artist: data.artistName,
                    }),
                });
              } else {
                relations.ownChronologySection.setSlot('kind', slots.chronologyKind);
              }

              if (
                data.isSingleFirstTrackArtistContribution &&
                !html.isBlank(relations.artistReleaseChronologySection)
              ) {
                relations.artistReleaseChronologySection.setSlot('kind', 'release');

                relations.artistReleaseChronologySection.setSlot('heading',
                  language.$(capsule, 'heading.artistReleases', {
                    artist: data.artistName,
                  }));

                chronologySections.push(relations.artistReleaseChronologySection);

                if (data.artistReleaseChronologySectionDiffers) {
                  relations.ownChronologySection.setSlot('heading',
                    language.$(capsule, 'heading.artistTracks', {
                      artist: data.artistName,
                    }));

                  chronologySections.push(relations.ownChronologySection);
                }
              } else {
                chronologySections.push(relations.ownChronologySection);
              }

              return chronologySections;
            }),
        ],
      })),
};
