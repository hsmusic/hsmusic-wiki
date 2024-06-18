import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateTextWithTooltip',
    'generateTooltip',
    'linkArtist',
    'linkAnythingMan',
    'linkExternalAsIcon',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, contribution) {
    const relations = {};

    relations.artistLink =
      relation('linkArtist', contribution.artist);

    relations.textWithTooltip =
      relation('generateTextWithTooltip');

    relations.tooltip =
      relation('generateTooltip');

    let previous = contribution;
    while (previous && previous.thing === contribution.thing) {
      previous = previous.previousBySameArtist;
    }

    let next = contribution;
    while (next && next.thing === contribution.thing) {
      next = next.nextBySameArtist;
    }

    if (previous) {
      relations.previousLink =
        relation('linkAnythingMan', previous.thing);
    }

    if (next) {
      relations.nextLink =
        relation('linkAnythingMan', next.thing);
    }

    if (!empty(contribution.artist.urls)) {
      relations.artistIcons =
        contribution.artist.urls
          .map(url => relation('linkExternalAsIcon', url));
    }

    return relations;
  },

  data(contribution) {
    return {
      contribution: contribution.annotation,
      urls: contribution.artist.urls,
    };
  },

  slots: {
    showContribution: {type: 'boolean', default: false},
    showIcons: {type: 'boolean', default: false},
    showChronology: {type: 'boolean', default: false},
    preventWrapping: {type: 'boolean', default: true},

    iconMode: {
      validate: v => v.is('inline', 'tooltip'),
      default: 'inline'
    },
  },

  generate(data, relations, slots, {html, language}) {
    const capsule = language.encapsulate('misc.artistLink');

    const hasContribution = !!(slots.showContribution && data.contribution);
    const hasExternalIcons = !!(slots.showIcons && relations.artistIcons);

    const parts = ['misc.artistLink'];
    const options = {};

    const tooltipContent = [];

    if (hasExternalIcons && slots.iconMode === 'tooltip') {
      tooltipContent.push(
        stitchArrays({
          icon: relations.artistIcons,
          url: data.urls,
        }).map(({icon, url}) => {
            icon.setSlots({
              context: 'artist',
              withText: true,
            });

            let platformText =
              language.formatExternalLink(url, {
                context: 'artist',
                style: 'platform',
              });

            // This is a pretty ridiculous hack, but we currently
            // don't have a way of telling formatExternalLink to *not*
            // use the fallback string, which just formats the URL as
            // its host/domain... so is technically detectable.
            if (platformText.toString() === (new URL(url)).host) {
              platformText =
                language.$(capsule, 'noExternalLinkPlatformName');
            }

            const platformSpan =
              html.tag('span', {class: 'icon-platform'},
                platformText);

            return [icon, platformSpan];
          }));
    }

    if (slots.showChronology) {
      tooltipContent.push(
        language.encapsulate(capsule, 'chronology', capsule => [
          html.tag('span', {class: 'chronology-link'},
            {[html.onlyIfContent]: true},

            language.$(capsule, 'previous', {
              [language.onlyIfOptions]: ['thing'],

              thing: relations.previousLink,
            })),

          html.tag('span', {class: 'chronology-link'},
            {[html.onlyIfContent]: true},

            language.$(capsule, 'next', {
              [language.onlyIfOptions]: ['thing'],

              thing: relations.nextLink,
            })),
        ]));
    }

    // TODO: It probably shouldn't be necessary to do an isBlank call here.
    options.artist =
      (html.isBlank(tooltipContent)
        ? relations.artistLink
        : relations.textWithTooltip.slots({
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
                  tooltipContent,
              }),
          }));

    if (hasContribution) {
      parts.push('withContribution');
      options.contrib = data.contribution;
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
