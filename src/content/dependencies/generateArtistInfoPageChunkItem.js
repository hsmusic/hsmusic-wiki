export default {
  extraDependencies: ['html', 'language'],

  slots: {
    content: {type: 'html'},

    otherArtistLinks: {validate: v => v.arrayOf(v.isHTML)},
    contribution: {type: 'string'},
    rerelease: {type: 'boolean'},
  },

  generate(slots, {html, language}) {
    let accentedContent = slots.content;

    accent: {
      if (slots.rerelease) {
        accentedContent =
          language.$('artistPage.creditList.entry.rerelease', {
            entry: accentedContent,
          });

        break accent;
      }

      const parts = ['artistPage.creditList.entry'];
      const options = {entry: accentedContent};

      if (slots.otherArtistLinks) {
        parts.push('withArtists');
        options.artists = language.formatConjunctionList(slots.otherArtistLinks);
      }

      if (slots.contribution) {
        parts.push('withContribution');
        options.contribution = slots.contribution;
      }

      if (parts.length === 1) {
        break accent;
      }

      accentedContent = language.formatString(parts.join('.'), options);
    }

    return (
      html.tag('li',
        {class: slots.rerelease && 'rerelease'},
        accentedContent));
  },
};
