import {readFile} from 'node:fs/promises';

// It stands for "HTML Entities", apparently. Cursed.
import he from 'he';

import T from '#things';

export function processLanguageSpec(spec) {
  const {
    'meta.languageCode': code,
    'meta.languageName': name,

    'meta.languageIntlCode': intlCode = null,
    'meta.hidden': hidden = false,

    ...strings
  } = spec;

  if (!code) {
    throw new Error(`Missing language code (file: ${file})`);
  }

  if (!name) {
    throw new Error(`Missing language name (${code})`);
  }

  const language = new T.Language();

  Object.assign(language, {
    code,
    intlCode,
    name,
    hidden,
    strings,
  });

  language.escapeHTML = string =>
    he.encode(string, {useNamedReferences: true});

  return language;
}

export async function processLanguageFile(file) {
  const contents = await readFile(file, 'utf-8');
  const spec = JSON.parse(contents);
  return processLanguageSpec(spec);
}
