import {compareArrays, empty, stitchArrays} from '#sugar';

export default {
  query: (creditContributions, contextContributions, _formatText) => {
    const query = {};

    const featuringFilter = contribution =>
      contribution.annotation === 'featuring';

    const wikiEditFilter = contribution =>
      contribution.annotation?.startsWith('edits for wiki');

    const normalFilter = contribution =>
      !featuringFilter(contribution) &&
      !wikiEditFilter(contribution);

    query.normalContributions =
      creditContributions.filter(normalFilter);

    query.featuringContributions =
      creditContributions.filter(featuringFilter);

    query.wikiEditContributions =
      creditContributions.filter(wikiEditFilter);

    const contextNormalContributions =
      contextContributions.filter(normalFilter);

    // Note that the normal contributions will implicitly *always*
    // "differ from context" if no context contributions are given,
    // as in release info lines.

    query.normalContributionArtistsDifferFromContext =
      !compareArrays(
        query.normalContributions.map(({artist}) => artist),
        contextNormalContributions.map(({artist}) => artist),
        {checkOrder: true});

    query.normalContributionAnnotationsDifferFromContext =
      !compareArrays(
        query.normalContributions.map(({annotation}) => annotation),
        contextNormalContributions.map(({annotation}) => annotation),
        {checkOrder: true});

    return query;
  },

  relations: (relation, query,
      _creditContributions,
      _contextContributions,
      formatText) => ({
    normalContributionLinks:
      query.normalContributions
        .map(contrib => relation('linkContribution', contrib)),

    featuringContributionLinks:
      query.featuringContributions
        .map(contrib => relation('linkContribution', contrib)),

    wikiEditsPart:
      relation('generateArtistCreditWikiEditsPart',
        query.wikiEditContributions),

    formatText:
      relation('transformContent', formatText),
  }),

  data: (query, _creditContributions, _contextContributions, _formatText) => ({
    normalContributionArtistsDifferFromContext:
      query.normalContributionArtistsDifferFromContext,

    normalContributionAnnotationsDifferFromContext:
      query.normalContributionAnnotationsDifferFromContext,

    normalContributionArtistDirectories:
      query.normalContributions
        .map(contrib => contrib.artist.directory),

    featuringContributionArtistDirectories:
      query.featuringContributions
        .map(contrib => contrib.artist.directory),

    hasWikiEdits:
      !empty(query.wikiEditContributions),
  }),

  slots: {
    // This string is mandatory.
    normalStringKey: {type: 'string'},

    // This string is optional.
    // Without it, there's no special behavior for "featuring" credits.
    normalFeaturingStringKey: {type: 'string'},

    // This string is optional.
    // Without it, "featuring" credits will always be alongside main credits.
    // It won't be used if contextContributions isn't provided.
    featuringStringKey: {type: 'string'},

    additionalStringOptions: {validate: v => v.isObject},

    showAnnotation: {type: 'boolean', default: false},
    showExternalLinks: {type: 'boolean', default: false},
    showChronology: {type: 'boolean', default: false},
    showWikiEdits: {type: 'boolean', default: false},

    chunkwrap: {type: 'boolean', default: true},

    chronologyKind: {type: 'string'},
  },

  generate(data, relations, slots, {html, language}) {
    if (!slots.normalStringKey) return html.blank();

    const effectivelyDiffers =
      (slots.showAnnotation && data.normalContributionAnnotationsDifferFromContext) ||
      (data.normalContributionArtistsDifferFromContext);

    for (const link of [
      ...relations.normalContributionLinks,
      ...relations.featuringContributionLinks,
    ]) {
      link.setSlots({
        showExternalLinks: slots.showExternalLinks,
        showChronology: slots.showChronology,
        chronologyKind: slots.chronologyKind,
      });
    }

    for (const link of relations.normalContributionLinks) {
      link.setSlots({
        showAnnotation: slots.showAnnotation,
      });
    }

    for (const link of relations.featuringContributionLinks) {
      link.setSlots({
        showAnnotation:
          (slots.featuringStringKey || slots.normalFeaturingStringKey
            ? false
            : slots.showAnnotation),
      });
    }

    let formattedArtistList = null;

    if (!html.isBlank(relations.formatText)) {
      formattedArtistList = relations.formatText;

      const substituteContrib = ({link, directory}) => ({
        match: {replacerKey: 'artist', replacerValue: directory},
        substitute: link,

        apply(link, node) {
          if (node.data.label) {
            link.setSlot('content', language.sanitize(node.data.label));
          }
        },
      });

      relations.formatText.setSlots({
        mode: 'inline',

        substitute: [
          stitchArrays({
            link: relations.normalContributionLinks,
            directory: data.normalContributionArtistDirectories,
          }).map(substituteContrib),

          stitchArrays({
            link: relations.featuringContributionLinks,
            directory: data.featuringContributionArtistDirectories,
          }).map(substituteContrib),
        ].flat(),
      });
    }

    let content;

    if (formattedArtistList) {
      if (effectivelyDiffers) {
        content =
          language.$(slots.normalStringKey, {
            ...slots.additionalStringOptions,
            artists: formattedArtistList,
          });
      }
    } else {
      if (empty(relations.normalContributionLinks)) {
        return html.blank();
      }

      const artistsList =
        (data.hasWikiEdits && slots.showWikiEdits
          ? language.$('misc.artistLink.withEditsForWiki', {
              artists:
                language.formatConjunctionList(relations.normalContributionLinks),

              edits:
                relations.wikiEditsPart.slots({
                  showAnnotation: slots.showAnnotation,
                }),
            })

          : language.formatConjunctionList(relations.normalContributionLinks));

      const featuringList =
        language.formatConjunctionList(relations.featuringContributionLinks);

      const everyoneList =
        language.formatConjunctionList([
          ...relations.normalContributionLinks,
          ...relations.featuringContributionLinks,
        ]);

      if (empty(relations.featuringContributionLinks)) {
        if (effectivelyDiffers) {
          content =
            language.$(slots.normalStringKey, {
              ...slots.additionalStringOptions,
              artists: artistsList,
            });
        } else {
          return html.blank();
        }
      } else if (effectivelyDiffers && slots.normalFeaturingStringKey) {
        content =
          language.$(slots.normalFeaturingStringKey, {
            ...slots.additionalStringOptions,
            artists: artistsList,
            featuring: featuringList,
        });
      } else if (slots.featuringStringKey) {
        content =
          language.$(slots.featuringStringKey, {
            ...slots.additionalStringOptions,
            artists: featuringList,
          });
      } else {
        content =
          language.$(slots.normalStringKey, {
            ...slots.additionalStringOptions,
            artists: everyoneList,
          });
      }
    }

    if (slots.chunkwrap) {
      // TODO: This is obviously evil.
      return (
        html.metatag('chunkwrap', {split: /,| (?=and)/},
          html.resolve(content)));
    } else {
      return content;
    }
  },
};
