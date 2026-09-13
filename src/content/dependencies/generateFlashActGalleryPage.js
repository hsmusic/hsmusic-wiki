export default {
  relations: (relation, act) => ({
    layout:
      relation('generatePageLayout'),

    flashIndexLink:
      relation('linkFlashIndex'),

    flashActNavLink:
      relation('linkFlashActWithTitle', act),

    flashActNavAccent:
      relation('generateFlashActNavAccent', act),

    sidebar:
      relation('generateFlashActSidebar', act, null),

    coverGrid:
      relation('generateCoverGrid',
        act.flashes.map(flash => flash.coverArtwork)),
  }),

  data: (act) => ({
    name: act.name,
    title: act.title,
    color: act.color,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('flashActPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.encapsulate(pageCapsule, 'title', workingCapsule => {
            const workingOptions = {act: data.name};

            if (data.title) {
              workingCapsule += '.withTitle'; // sigh
              workingOptions.title =
                html.tag('span', {class: 'flash-act-title'},
                  data.title);
            }

            return language.$(workingCapsule, workingOptions);
          }),

        color: data.color,
        headingMode: 'static',

        mainClasses: ['flash-index'],
        mainContent: [
          relations.coverGrid.slots({
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
