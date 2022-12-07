import {readFile} from 'fs/promises';

// It stands for "HTML Entities", apparently. Cursed.
import he from 'he';

import T from './things/index.js';

// TODO: define somewhere besides upd8.js obviously
export async function processLanguageFile(file) {
  const contents = await readFile(file, 'utf-8');
  const json = JSON.parse(contents);

  const code = json['meta.languageCode'];
  if (!code) {
    throw new Error(`Missing language code (file: ${file})`);
  }
  delete json['meta.languageCode'];

  const intlCode = json['meta.languageIntlCode'] ?? null;
  delete json['meta.languageIntlCode'];

  const name = json['meta.languageName'];
  if (!name) {
    throw new Error(`Missing language name (${code})`);
  }
  delete json['meta.languageName'];

  const hidden = json['meta.hidden'] ?? false;
  delete json['meta.hidden'];

  const language = new T.Language();
  language.code = code;
  language.intlCode = intlCode;
  language.name = name;
  language.hidden = hidden;
  language.escapeHTML = (string) =>
    he.encode(string, {useNamedReferences: true});
  language.strings = json;
  return language;
}
