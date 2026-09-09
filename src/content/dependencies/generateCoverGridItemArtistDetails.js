export default {
  data: (artwork) => ({
    label:
      artwork.label,

    artistNames:
      artwork.artistContribs
        .map(({artist}) => artist.name),

    creditAsFrom:
      artwork.artistContribs
        .every(({artist}) => artist.creditArtworksAsFromArtist),
  }),

  generate: (data, {language}) =>
    language.encapsulate('misc.coverGrid.details', capsule =>
      language.encapsulate(capsule, workingCapsule => {
        const workingOptions = {};

        if (data.creditAsFrom) {
          workingCapsule += '.artworkFrom';
        } else {
          workingCapsule += '.artworkBy';
        }

        workingOptions[language.onlyIfOptions] = ['artists'];
        workingOptions.artists =
          language.formatUnitList(data.artistNames);

        if (data.label) {
          workingCapsule += '.customLabel';
          workingOptions.label = data.label;
        }

        return language.$(workingCapsule, workingOptions);
      })),
};
