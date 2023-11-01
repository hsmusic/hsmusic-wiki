import {readFile} from 'node:fs/promises';

import chokidar from 'chokidar';
import he from 'he'; // It stands for "HTML Entities", apparently. Cursed.

import {withAggregate} from '#sugar';
import T from '#things';

const {Language} = T;

export function processLanguageSpec(spec) {
  const {
    'meta.languageCode': code,
    'meta.languageName': name,

    'meta.languageIntlCode': intlCode = null,
    'meta.hidden': hidden = false,

    ...strings
  } = spec;

  withAggregate({message: `Errors validating language spec`}, ({push}) => {
    if (!code) {
      push(new Error(`Missing language code (file: ${file})`));
    }

    if (!name) {
      push(new Error(`Missing language name (${code})`));
    }
  });

  return {code, intlCode, name, hidden, strings};
}

export function initializeLanguageObject() {
  const language = new Language();

  language.escapeHTML = string =>
    he.encode(string, {useNamedReferences: true});

  return language;
}

export async function processLanguageFile(file) {
  const contents = await readFile(file, 'utf-8');
  const spec = JSON.parse(contents);

  const language = initializeLanguageObject();
  const properties = processLanguageSpec(spec);
  Object.assign(language, properties);

  return language;
}
