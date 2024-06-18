export default {
  contentDependencies: [
    'generateContributionTooltip',
    'generateTextWithTooltip',
    'linkArtist',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, contribution) => ({
    artistLink:
      relation('linkArtist', contribution.artist),

    textWithTooltip:
      relation('generateTextWithTooltip'),

    tooltip:
      relation('generateContributionTooltip', contribution),
  }),

  data: (contribution) => ({
    contribution: contribution.annotation,
    urls: contribution.artist.urls,
  }),

  slots: {
    showContribution: {type: 'boolean', default: false},
    showExternalLinks: {type: 'boolean', default: false},
    showChronology: {type: 'boolean', default: false},

    preventWrapping: {type: 'boolean', default: true},
  },

  generate: (data, relations, slots, {html, language}) =>
    html.tag('span', {class: 'contribution'},
      {[html.noEdgeWhitespace]: true},

      slots.preventWrapping &&
        {class: 'nowrap'},

      language.encapsulate('misc.artistLink', workingCapsule => {
        const workingOptions = {};

        workingOptions.artist =
          relations.textWithTooltip.slots({
            customInteractionCue: true,

            text:
              relations.artistLink.slots({
                attributes: {class: 'text-with-tooltip-interaction-cue'},
              }),

            tooltip:
              relations.tooltip.slots({
                showExternalLinks: slots.showExternalLinks,
                showChronology: slots.showChronology,
              }),
          });

        if (slots.showContribution && data.contribution) {
          workingCapsule += '.withContribution';
          workingOptions.contrib =
            data.contribution;
        }

        return language.formatString(workingCapsule, workingOptions);
      })),
};
