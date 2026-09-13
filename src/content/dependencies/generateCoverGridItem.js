export default {
  query: (artworkOrThing) => ({
    artwork:
      (artworkOrThing.isArtwork
        ? artworkOrThing
        : null),

    thing:
      (artworkOrThing.isArtwork
        ? artworkOrThing.thing
        : artworkOrThing),
  }),

  relations: (relation, query, _artworkOrThing) => ({
    link:
      relation('linkAnythingMan', query.thing),

    image:
      (query.artwork
        ? relation('image', query.artwork)
        : relation('image')),

    artistDetails:
      (query.artwork
        ? relation('generateCoverGridItemArtistDetails', query.artwork)
        : null),
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},

    notFromThisGroup: {type: 'boolean', default: false},

    // Optional - overrides the defaults
    link: {validate: v => v.isHTML},
    image: {validate: v => v.isHTML},
    name: {validate: v => v.isHTML},
    details: {validate: v => v.isHTML},

    // Optional
    tab: {type: 'html', mutable: false},

    // Managed by generateCoverGrid
    lazy: {type: 'boolean', default: false},
    cut: {type: 'boolean', default: false},
  },

  generate(relations, slots, {html, language}) {
    const link =
      slots.link ??
      relations.link;

    const image =
      slots.image ??
      relations.image;

    const name =
      slots.name ??
      html.resolve(link, {normalize: 'plain'});

    const details =
      slots.details ??
      relations.artistDetails;

    image.setSlots({
      thumb: 'medium',
      lazy: slots.lazy,

      missingSourceContent: name,
    });

    const attributes = html.attributes([
      {class: ['grid-item', 'box']},

      link.getSlotValue('attributes'),
      slots.attributes,

      !html.isBlank(slots.tab) &&
        {class: 'has-tab'},

      slots.cut &&
        {class: 'hidden-by-expandable-cut'},
    ]);

    const content = html.tags([
      html.tag('span', {[html.onlyIfContent]: true}, slots.tab),

      image,

      html.tag('span',
        {[html.onlyIfContent]: true},

        (slots.notFromThisGroup
          ? language.encapsulate('misc.coverGrid.details.notFromThisGroup', capsule =>
              language.$(capsule, {
                name,
                marker:
                  html.tag('span', {class: 'grid-name-marker'},
                    language.$(capsule, 'marker')),
              }))
          : name)),

      html.tag('span',
        {[html.onlyIfContent]: true},

        language.$('misc.coverGrid.details.accent', {
          [language.onlyIfOptions]: ['details'],

          details,
        })),
    ]);

    link.setSlots({
      colorContext: 'image-box',
      attributes,
      content,
    });

    return link;
  },
};
