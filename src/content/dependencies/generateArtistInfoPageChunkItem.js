export default {
  extraDependencies: ['html', 'language'],

  slots: {
    content: {
      type: 'html',
      mutable: false,
    },

    contribution: {
      type: 'html',
      mutable: false,
    },

    otherArtistLinks: {
      validate: v => v.strictArrayOf(v.isHTML),
    },

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

      if (!html.isBlank(slots.contribution)) {
        parts.push('withContribution');
        options.contribution = slots.contribution;
      }

      if (parts.length === 1) {
        break accent;
      }

      accentedContent = language.formatString(...parts, options);
    }

    return (
      html.tag('li',
        slots.rerelease && {class: 'rerelease'},
        accentedContent));
  },
};
