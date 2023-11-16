import * as html from '#html';
import {getArtistNumContributions} from '#wiki-data';

export function generateRedirectHTML(title, target, {language}) {
  return `<!DOCTYPE html>\n` + html.tag('html', [
    html.tag('head', [
      html.tag('title', language.$('redirectPage.title', {title})),
      html.tag('meta', {charset: 'utf-8'}),

      html.tag('meta', {
        'http-equiv': 'refresh',
        content: `0;url=${target}`,
      }),

      // TODO: Is this OK for localized pages?
      html.tag('link', {
        rel: 'canonical',
        href: target,
      }),
    ]),

    html.tag('body',
      html.tag('main', [
        html.tag('h1',
          language.$('redirectPage.title', {title})),
        html.tag('p',
          language.$('redirectPage.infoLine', {
            target: html.tag('a', {href: target}, target),
          })),
      ])),
  ]);
}

export function generateRandomLinkDataJSON({wikiData}) {
  const {albumData, artistData} = wikiData;

  return JSON.stringify({
    albumDirectories:
      albumData
        .map(album => album.directory),

    albumTrackDirectories:
      albumData
        .map(album => album.tracks
          .map(track => track.directory)),

    artistDirectories:
      artistData
        .map(artist => artist.directory),

    artistNumContributions:
      artistData
        .map(artist => getArtistNumContributions(artist)),
  });
}
