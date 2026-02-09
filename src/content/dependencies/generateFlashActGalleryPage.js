export default {
  relations: (relation, act) => ({
    layout:
      relation('generatePageLayout'),

    flashIndexLink:
      relation('linkFlashIndex'),

    flashActNavLink:
      relation('linkFlashActInline', act),

    flashActNavAccent:
      relation('generateFlashActNavAccent', act),

    sidebar:
      relation('generateFlashActSidebar', act, null),

    coverGrid:
      relation('generateCoverGrid'),

    coverGridImages:
      act.flashes
        .map(flash => relation('image', flash.coverArtwork)),

    flashLinks:
      act.flashes
        .map(flash => relation('linkFlash', flash)),
  }),

  data: (act) => ({
    name: act.name,
    nameHTML: act.nameHTML,
    color: act.color,

    flashNames:
      act.flashes.map(flash => flash.name),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('flashPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            flash:
              html.ifelse([
                html.permit(data.nameHTML, {strip: true}),
                language.sanitize(data.name),
              ]),
          }),

        color: data.color,
        headingMode: 'static',

        mainClasses: ['flash-index'],
        mainContent: [
          relations.coverGrid.slots({
            links: relations.flashLinks,
            images: relations.coverGridImages,
            names: data.flashNames,
            lazy: 6,
          }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {html: relations.flashIndexLink},
          {html: relations.flashActNavLink},
        ],

        navBottomRowContent: relations.flashActNavAccent,

        leftSidebar: relations.sidebar,
      })),
};
