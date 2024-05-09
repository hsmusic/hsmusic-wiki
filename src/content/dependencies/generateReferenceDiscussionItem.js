import {empty} from '#sugar';

export default {
  contentDependencies: ['linkArtist', 'linkExternal'],
  extraDependencies: ['html', 'language'],

  relations(relation, discussion) {
    const relations = {};

    relations.externalLink =
      relation('linkExternal', discussion.url);

    if (!empty(discussion.participatingArtists)) {
      relations.participatingArtistLinks =
        discussion.participatingArtists
          .map(artist => relation('linkArtist', artist));
    }

    return relations;
  },

  data: (discussion) => ({
    url: discussion.url,
    date: discussion.date,
    annotation: discussion.annotation,
  }),

  generate: (data, relations, {html, language}) => {
    const prefix = 'misc.reviewPoints.entry.referenceDiscussions';

    const parts = [prefix, 'item'];
    const options = {};

    options.dateAccent =
      language.$(prefix, 'dateAccent', {
        date:
          language.formatDate(data.date),
      });

    const linkParts = [prefix, 'link'];
    const linkOptions = {};

    linkOptions.platform =
      language.formatExternalLink(data.url);

    if (data.annotation) {
      linkParts.push('withAnnotation');
      linkOptions.annotation =
        language.sanitize(data.annotation);
    }

    options.link =
      relations.externalLink.slots({
        tab: 'separate',
        indicateExternal: true,

        content:
          language.$(...linkParts, linkOptions),
      });

    if (relations.participatingArtistLinks) {
      parts.push('withParticipants');
      options.participantsAccent =
        html.tag('span', {class: 'review-point-discussion-participants'},
          language.$(prefix, 'participantsAccent', {
            participants:
              language.formatUnitList(relations.participatingArtistLinks),
          }));
    }

    return html.tag('li', language.$(...parts, options));
  }
};
