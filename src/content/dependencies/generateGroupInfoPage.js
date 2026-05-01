import {stitchArrays} from '#sugar';

export default {
  sprawl: ({wikiInfo}) => ({
    enableGroupUI:
      wikiInfo.enableGroupUI,

    wikiColor:
      wikiInfo.color,
  }),

  query: (_sprawl, group) => ({
    aliasLinkedArtists:
      group.closelyLinkedArtists
        .filter(({annotation}) =>
          annotation === 'alias'),

    generalLinkedArtists:
      group.closelyLinkedArtists
        .filter(({annotation}) =>
          annotation !== 'alias'),
  }),

  relations: (relation, query, sprawl, group) => ({
    layout:
      relation('generatePageLayout'),

    navLinks:
      relation('generateGroupNavLinks', group),

    secondaryNav:
      (sprawl.enableGroupUI
        ? relation('generateGroupSecondaryNav', group)
        : null),

    sidebar:
      (sprawl.enableGroupUI
        ? relation('generateGroupSidebar', group)
        : null),

    wikiColorAttribute:
      relation('generateColorStyleAttribute', sprawl.wikiColor),

    closeArtistLinks:
      query.generalLinkedArtists
        .map(({artist}) => relation('linkArtist', artist)),

    aliasArtistLinks:
      query.aliasLinkedArtists
        .map(({artist}) => relation('linkArtist', artist)),

    visitLinks:
      group.urls
        .map(entry => relation('linkExternal', entry)),

    description:
      relation('transformContent', group.description),

    albumSection:
      relation('generateGroupInfoPageAlbumsSection', group),
  }),

  data: (query, _sprawl, group) => ({
    name:
      group.name,

    color:
      group.color,

    closeArtistAnnotations:
      query.generalLinkedArtists
        .map(({annotation}) => annotation),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('groupInfoPage', pageCapsule =>
      relations.layout.slots({
        title: language.$(pageCapsule, 'title', {group: data.name}),
        headingMode: 'sticky',
        color: data.color,

        mainContent: [
          html.tag('p',
            {[html.onlyIfContent]: true},
            {[html.joinChildren]: html.tag('br')},

            language.encapsulate(pageCapsule, 'closelyLinkedArtists', capsule => [
              language.encapsulate(capsule, capsule => {
                const [workingCapsule, option] =
                  (relations.closeArtistLinks.length === 0
                    ? [null, null]
                 : relations.closeArtistLinks.length === 1
                    ? [language.encapsulate(capsule, 'one'), 'artist']
                    : [language.encapsulate(capsule, 'multiple'), 'artists']);

                if (!workingCapsule) return html.blank();

                return language.$(workingCapsule, {
                  [option]:
                    language.formatUnitList(
                      stitchArrays({
                        link: relations.closeArtistLinks,
                        annotation: data.closeArtistAnnotations,
                      }).map(({link, annotation}) =>
                          language.encapsulate(capsule, 'artist', workingCapsule => {
                            const workingOptions = {};

                            workingOptions.artist =
                              link.slots({
                                attributes: [relations.wikiColorAttribute],
                              });

                            if (annotation) {
                              workingCapsule += '.withAnnotation';
                              workingOptions.annotation = annotation;
                            }

                            return language.$(workingCapsule, workingOptions);
                          }))),
                });
              }),

              language.$(capsule, 'aliases', {
                [language.onlyIfOptions]: ['aliases'],

                aliases:
                  language.formatConjunctionList(
                    relations.aliasArtistLinks.map(link =>
                      link.slots({
                        attributes: [relations.wikiColorAttribute],
                      }))),
              }),
            ])),

          html.tag('p',
            {[html.onlyIfContent]: true},

            language.$('releaseInfo.visitOn', {
              [language.onlyIfOptions]: ['links'],

              links:
                language.formatDisjunctionList(
                  relations.visitLinks
                    .map(link => link.slot('context', 'group'))),
            })),

          html.tag('blockquote',
            {[html.onlyIfContent]: true},
            relations.description.slot('mode', 'multiline')),

          relations.albumSection,
        ],

        leftSidebar:
          (relations.sidebar
            ? relations.sidebar
                .content /* TODO: Kludge. */
            : null),

        navLinkStyle: 'hierarchical',
        navLinks: relations.navLinks.content,

        secondaryNav: relations.secondaryNav ?? null,
      })),
};
