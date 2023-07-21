import {empty} from '#sugar';

export default {
  contentDependencies: [
    'linkArtist',
    'linkExternalAsIcon',
  ],

  extraDependencies: [
    'html',
    'language',
  ],

  relations(relation, contribution) {
    const relations = {};

    relations.artistLink =
      relation('linkArtist', contribution.who);

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
    const options = {artist: relations.artistLink};

    if (hasContribution) {
      parts.push('withContribution');
      options.contrib = data.what;
    }

    if (hasExternalIcons && slots.iconMode === 'inline') {
      parts.push('withExternalLinks');
      options.links =
        html.tag('span',
          {
            [html.noEdgeWhitespace]: true,
            class: ['icons', 'icons-inline'],
          },
          language.formatUnitList(
            relations.artistIcons
              .slice(0, 4)));
    }

    let content = language.formatString(parts.join('.'), options);

    if (hasExternalIcons && slots.iconMode === 'tooltip') {
      content = [
        content,
        html.tag('span',
          {
            [html.noEdgeWhitespace]: true,
            class: ['icons', 'icons-tooltip'],
            inert: true,
          },
          html.tag('span',
            {
              [html.noEdgeWhitespace]: true,
              [html.joinChildren]: '',
              class: 'icons-tooltip-content',
            },
            relations.artistIcons)),
      ];
    }

    if (hasContribution || hasExternalIcons) {
      content =
        html.tag('span', {
          [html.noEdgeWhitespace]: true,
          [html.joinChildren]: '',

          class: [
            'contribution',

            hasExternalIcons &&
            slots.iconMode === 'tooltip' &&
              'has-tooltip',

            parts.length > 1 &&
            slots.preventWrapping &&
              'nowrap',
          ],
        }, content);
    }

    return content;
  }
};
