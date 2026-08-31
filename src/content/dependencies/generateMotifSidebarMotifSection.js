export default {
  relations: (relation, _motif, motifSection) => ({
    colorStyle:
      relation('generateColorStyleAttribute', motifSection.color),

    motifLinks:
      motifSection.motifs
        .map(motif => relation('linkMotif', motif)),
  }),

  data: (motif, motifSection) => ({
    name:
      motifSection.name,

    includesCurrentMotif:
      motifSection.motifs.includes(motif),

    currentMotifIndex:
      motifSection.motifs.indexOf(motif),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('motifSidebar.motifList', capsule =>
      html.tag('details',
        relations.colorStyle,

        data.includesCurrentMotif && [
          {class: 'current'},
          {open: true},
        ],

        html.tag('summary',
          html.tag('span',
            html.tag('b',
              html.metatag('chunkwrap', {split: /(?<=^From)/},
                language.$(capsule, 'section', {
                  section: data.name,
                }))))),

        html.tag('ul',
          relations.motifLinks
            .map((link, index) =>
              html.tag('li',
                index === data.currentMotifIndex &&
                  {class: 'current'},

                link))))),
};
