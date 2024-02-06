import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateTextWithTooltip',
    'generateTooltip',
    'linkArtist',
    'linkExternalAsIcon',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, contribution) {
    const relations = {};

    relations.artistLink =
      relation('linkArtist', contribution.who);

    relations.textWithTooltip =
      relation('generateTextWithTooltip');

    relations.tooltip =
      relation('generateTooltip');

    if (!empty(contribution.who.urls)) {
      relations.artistIcons =
        contribution.who.urls
          .map(url => relation('linkExternalAsIcon', url));
    }

    return relations;
  },

  data(contribution) {
    return {
      what: contribution.what,
    };
  },

  slots: {
    showContribution: {type: 'boolean', default: false},
    showIcons: {type: 'boolean', default: false},
    preventWrapping: {type: 'boolean', default: true},

    iconMode: {
      validate: v => v.is('inline', 'tooltip'),
      default: 'inline'
    },
  },

  generate(data, relations, slots, {html, language}) {
    const hasContribution = !!(slots.showContribution && data.what);
    const hasExternalIcons = !!(slots.showIcons && relations.artistIcons);

    const parts = ['misc.artistLink'];
    const options = {};

    options.artist =
      (hasExternalIcons && slots.iconMode === 'tooltip'
        ? relations.textWithTooltip.slots({
            customInteractionCue: true,

            text:
              relations.artistLink.slots({
                attributes: {class: 'text-with-tooltip-interaction-cue'},
              }),

            tooltip:
              relations.tooltip.slots({
                attributes:
                  {class: ['icons', 'icons-tooltip']},

                contentAttributes:
                  {[html.joinChildren]: ''},

                content:
                  relations.artistIcons
                    .map(icon =>
                      icon.slots({
                        context: 'artist',
                        withText: true,
                      })),
              }),
          })
        : relations.artistLink);

    if (hasContribution) {
      parts.push('withContribution');
      options.contrib = data.what;
    }

    if (hasExternalIcons && slots.iconMode === 'inline') {
      parts.push('withExternalLinks');
      options.links =
        html.tag('span', {class: ['icons', 'icons-inline']},
          {[html.noEdgeWhitespace]: true},
          language.formatUnitList(
            relations.artistIcons
              .slice(0, 4)
              .map(icon => icon.slot('context', 'artist'))));
    }

    const contributionPart =
      language.formatString(...parts, options);

    if (!hasContribution && !hasExternalIcons) {
      return contributionPart;
    }

    return (
      html.tag('span', {class: 'contribution'},
        {[html.noEdgeWhitespace]: true},

        parts.length > 1 &&
        slots.preventWrapping &&
          {class: 'nowrap'},

        contributionPart));
  },
};
