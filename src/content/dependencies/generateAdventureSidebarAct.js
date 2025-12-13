import {stitchArrays} from '#sugar';

export default {
  relations: (relation, _adventure, _flash, act) => ({
    colorStyle:
      relation('generateColorStyleAttribute', act.color),

    flashLinks:
      act.flashes.map(flash => relation('linkFlash', flash)),
  }),

  data: (_adventure, flash, act) => ({
    isFlashPage: !!flash,

    name: act.name,
    isDefaultAct: act.isDefaultAct,

    flashesAreCurrentFlash:
      act.flashes.map(flaaaash => flaaaash === flash),

    includesCurrentFlash:
      act.flashes.some(flaaaash => flaaaash === flash),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('adventureSidebar.flashList', capsule =>
      html.tag('details',
        data.includesCurrentFlash &&
          {class: 'current'},

        data.isFlashPage &&
        data.includesCurrentFlash &&
          {open: true},

        [
          html.tag('summary',
            relations.colorStyle.slot('context', 'primary-only'),

            html.tag('span',
              language.$(capsule, 'act', {
                act:
                  html.tag('b',
                    (data.isDefaultAct
                      ? language.$(capsule, 'act.fallback')
                        // Expressly do not sanitize flash act name.
                        // HTML written in data gets passed through.
                      : data.name)),
              }))),

          html.tag('ul',
            stitchArrays({
              flashLink: relations.flashLinks,
              isCurrentFlash: data.flashesAreCurrentFlash,
            }).map(({flashLink, isCurrentFlash}) =>
                html.tag('li',
                  isCurrentFlash &&
                    {class: 'current'},

                  flashLink))),
        ])),
};