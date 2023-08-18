import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['linkFlash', 'linkFlashIndex'],
  extraDependencies: ['html', 'wikiData'],

  // So help me Gog, the flash sidebar is heavily hard-coded.

  sprawl: ({flashActData}) => ({flashActData}),

  query(sprawl, flash) {
    const flashActs =
      sprawl.flashActData.slice();

    const act6 =
      flashActs
        .findIndex(act => act.name.startsWith('Act 6'));

    const postCanon =
      flashActs
        .findIndex(act => act.name.includes('Post Canon'));

    const outsideCanon =
      postCanon +
      flashActs
        .slice(postCanon)
        .findIndex(act => !act.name.includes('Post Canon'));

    const currentAct = flash.act;

    const actIndex =
      flashActs
        .indexOf(currentAct);

    const side =
      (actIndex < 0
        ? 0
     : actIndex < act6
        ? 1
     : actIndex < outsideCanon
        ? 2
        : 3);

    const sideActs =
      flashActs
        .filter((act, index) =>
          act.name.startsWith('Act 1') ||
          act.name.startsWith('Act 6 Act 1') ||
          act.name.startsWith('Hiveswap') ||
          index >= outsideCanon);

    const currentSideIndex =
      sideActs
        .findIndex(act => {
          if (act.name.startsWith('Act 1')) {
            return side === 1;
          } else if (act.name.startsWith('Act 6 Act 1')) {
            return side === 2;
          } else if (act.name.startsWith('Hiveswap Act 1')) {
            return side === 3;
          } else {
            return act === currentAct;
          }
        })

    const sideNames =
      sideActs
        .map(act => {
          if (act.name.startsWith('Act 1')) {
            return `Side 1 (Acts 1-5)`;
          } else if (act.name.startsWith('Act 6 Act 1')) {
            return `Side 2 (Acts 6-7)`;
          } else if (act.name.startsWith('Hiveswap Act 1')) {
            return `Outside Canon (Misc. Games)`;
          } else {
            return act.name;
          }
        });

    const sideColors =
      sideActs
        .map(act => {
          if (act.name.startsWith('Act 1')) {
            return '#4ac925';
          } else if (act.name.startsWith('Act 6 Act 1')) {
            return '#1076a2';
          } else if (act.name.startsWith('Hiveswap Act 1')) {
            return '#008282';
          } else {
            return act.color;
          }
        });

    const sideFirstFlashes =
      sideActs
        .map(act => act.flashes[0]);

    const scopeActs =
      flashActs
        .filter((act, index) => {
          if (index < act6) {
            return side === 1;
          } else if (index < outsideCanon) {
            return side === 2;
          } else {
            return false;
          }
        });

    const currentScopeActIndex =
      scopeActs.indexOf(currentAct);

    const scopeActNames =
      scopeActs
        .map(act => act.name);

    const scopeActFirstFlashes =
      scopeActs
        .map(act => act.flashes[0]);

    const currentActFlashes =
      currentAct.flashes;

    const currentFlashIndex =
      currentActFlashes
        .indexOf(flash);

    return {
      currentSideIndex,
      sideNames,
      sideColors,
      sideFirstFlashes,

      currentScopeActIndex,
      scopeActNames,
      scopeActFirstFlashes,

      currentActFlashes,
      currentFlashIndex,
    };
  },

  relations: (relation, query) => ({
    flashIndexLink:
      relation('linkFlashIndex'),

    sideFirstFlashLinks:
      query.sideFirstFlashes
        .map(flash => relation('linkFlash', flash)),

    scopeActFirstFlashLinks:
      query.scopeActFirstFlashes
        .map(flash => relation('linkFlash', flash)),

    currentActFlashLinks:
      query.currentActFlashes
        .map(flash => relation('linkFlash', flash)),
  }),

  data: (query) => ({
    currentSideIndex: query.currentSideIndex,
    sideColors: query.sideColors,
    sideNames: query.sideNames,

    currentScopeActIndex: query.currentScopeActIndex,
    scopeActNames: query.scopeActNames,

    currentFlashIndex: query.currentFlashIndex,
  }),

  generate(data, relations, {html}) {
    const currentActFlashList =
      html.tag('ul',
        relations.currentActFlashLinks
          .map((flashLink, index) =>
            html.tag('li',
              {class: index === data.currentFlashIndex && 'current'},
              flashLink)));

    return {
      leftSidebarContent: html.tags([
        html.tag('h1', relations.flashIndexLink),

        html.tag('dl',
          stitchArrays({
            sideFirstFlashLink: relations.sideFirstFlashLinks,
            sideColor: data.sideColors,
            sideName: data.sideNames,
          }).map(({sideFirstFlashLink, sideColor, sideName}, index) => [
              // Side acts are displayed whether part of Homestuck proper or
              // not, and they're always the same regardless the current flash
              // page. Scope acts, if applicable, and the list of flashes
              // belonging to the current act, will be inserted after the
              // heading of the current side.
              html.tag('dt',
                {class: [
                  'side',
                  index === data.currentSideIndex && 'current',
                ]},
                sideFirstFlashLink.slots({
                  color: sideColor,
                  content: sideName,
                })),

              // Scope acts are only applicable when inside Homestuck proper.
              // Hiveswap and all acts beyond are each considered to be its
              // own "side".
              index === data.currentSideIndex &&
              data.currentScopeActIndex !== -1 &&
                stitchArrays({
                  scopeActFirstFlashLink: relations.scopeActFirstFlashLinks,
                  scopeActName: data.scopeActNames,
                }).map(({scopeActFirstFlashLink, scopeActName}, index) => [
                    html.tag('dt',
                      {class: index === data.currentScopeActIndex && 'current'},
                      scopeActFirstFlashLink.slot('content', scopeActName)),

                    // Inside Homestuck proper, the flash list of the current
                    // act should show after the heading for the relevant
                    // scope act.
                    index === data.currentScopeActIndex &&
                      html.tag('dd', currentActFlashList),
                  ]),

              // Outside of Homestuck proper, the current act is represented
              // by a side instead of a scope act, so place its flash list
              // after the heading for the relevant side.
              index === data.currentSideIndex &&
              data.currentScopeActIndex === -1 &&
                html.tag('dd', currentActFlashList),
            ])),

      ]),
    };
  },
};
