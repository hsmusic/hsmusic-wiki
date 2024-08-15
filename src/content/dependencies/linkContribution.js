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
    chronologyKind: {type: 'string'},
  },

  generate: (data, relations, slots, {html, language}) =>
    html.tag('span', {class: 'contribution'},
      {[html.noEdgeWhitespace]: true},

      slots.preventWrapping &&
        {class: 'nowrap'},

      language.encapsulate('misc.artistLink', workingCapsule => {
        const workingOptions = {};

        // Filling slots early is necessary to actually give the tooltip
        // content. Otherwise, the coming-up html.isBlank() always reports
        // the tooltip as blank!
        relations.tooltip.setSlots({
          showExternalLinks: slots.showExternalLinks,
          showChronology: slots.showChronology,
          chronologyKind: slots.chronologyKind,
        });

        workingOptions.artist =
          (html.isBlank(relations.tooltip)
            ? relations.artistLink
            : relations.textWithTooltip.slots({
                customInteractionCue: true,

                text:
                  relations.artistLink.slots({
                    attributes: {class: 'text-with-tooltip-interaction-cue'},
                  }),

                tooltip:
                  relations.tooltip,
              }));

        if (slots.showContribution && data.contribution) {
          workingCapsule += '.withContribution';
          workingOptions.contrib =
            data.contribution;
        }

        return language.formatString(workingCapsule, workingOptions);
      })),
};
