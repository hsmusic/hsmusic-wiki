import {stitchArrays} from '#sugar';

import striptags from 'striptags';

export default {
  contentDependencies: [
    'generateCoverGrid',
    'generateFlashActNavAccent',
    'generateFlashActSidebar',
    'generatePageLayout',
    'image',
    'linkFlash',
    'linkFlashAct',
    'linkFlashIndex',
  ],

  extraDependencies: ['language'],

  relations: (relation, act) => ({
    layout:
      relation('generatePageLayout'),

    flashIndexLink:
      relation('linkFlashIndex'),

    flashActNavLink:
      relation('linkFlashAct', act),

    flashActNavAccent:
      relation('generateFlashActNavAccent', act),

    sidebar:
      relation('generateFlashActSidebar', act, null),

    coverGrid:
      relation('generateCoverGrid'),

    coverGridImages:
      act.flashes
        .map(_flash => relation('image')),

    flashLinks:
      act.flashes
        .map(flash => relation('linkFlash', flash)),
  }),

  data: (act) => ({
    name: act.name,
    color: act.color,

    flashNames:
      act.flashes.map(flash => flash.name),

    flashCoverPaths:
      act.flashes.map(flash =>
        ['media.flashArt', flash.directory, flash.coverArtFileExtension])
  }),

  generate: (data, relations, {language}) =>
    language.encapsulate('flashPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            flash: striptags(data.name),
          }),

        color: data.color,
        headingMode: 'static',

        mainClasses: ['flash-index'],
        mainContent: [
          relations.coverGrid.slots({
            links: relations.flashLinks,
            names: data.flashNames,
            lazy: 6,

            images:
              stitchArrays({
                image: relations.coverGridImages,
                path: data.flashCoverPaths,
              }).map(({image, path}) =>
                  image.slot('path', path)),
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
