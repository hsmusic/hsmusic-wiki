import * as path from 'path';

import {generateRedirectHTML} from './page-template.js';

import {
  logInfo,
  logWarn,
  progressPromiseAll,
} from '../util/cli.js';

// Code that's common 8etween the 8uild code (i.e. upd8.js) and gener8ted
// site code should 8e put here. Which, uh, ~~only really means this one
// file~~ is now a variety of useful utilities!
//
// Rather than hard code it, anything in this directory can 8e shared across
// 8oth ends of the code8ase.
// (This gets symlinked into the --data-path directory.)
const UTILITY_DIRECTORY = 'util';

// Code that's used only in the static site! CSS, cilent JS, etc.
// (This gets symlinked into the --data-path directory.)
const STATIC_DIRECTORY = 'static';

import {
  copyFile,
  mkdir,
  stat,
  symlink,
  writeFile,
  unlink,
} from 'fs/promises';

export async function writePage({
  html,
  oEmbedJSON = '',
  paths,
}) {
  await mkdir(paths.output.directory, {recursive: true});

  await Promise.all([
    writeFile(paths.output.documentHTML, html),

    oEmbedJSON &&
      writeFile(paths.output.oEmbedJSON, oEmbedJSON),
  ].filter(Boolean));
}

export function writeSymlinks({
  srcRootDirname,
  mediaPath,
  outputPath,
  urls,
}) {
  return progressPromiseAll('Writing site symlinks.', [
    link(path.join(srcRootDirname, UTILITY_DIRECTORY), 'shared.utilityRoot'),
    link(path.join(srcRootDirname, STATIC_DIRECTORY), 'shared.staticRoot'),
    link(mediaPath, 'media.root'),
  ]);

  async function link(directory, urlKey) {
    const pathname = urls.from('shared.root').toDevice(urlKey);
    const file = path.join(outputPath, pathname);

    try {
      await unlink(file);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    try {
      await symlink(path.resolve(directory), file);
    } catch (error) {
      if (error.code === 'EPERM') {
        await symlink(path.resolve(directory), file, 'junction');
      }
    }
  }
}

export async function writeFavicon({
  mediaPath,
  outputPath,
}) {
  const faviconFile = 'favicon.ico';

  try {
    await stat(path.join(mediaPath, faviconFile));
  } catch (error) {
    return;
  }

  try {
    await copyFile(
      path.join(mediaPath, faviconFile),
      path.join(outputPath, faviconFile));
  } catch (error) {
    logWarn`Failed to copy favicon! ${error.message}`;
    return;
  }

  logInfo`Copied favicon to site root.`;
}

export async function writeSharedFilesAndPages({
  language,
  mediaPath,
  outputPath,
  urls,
  wikiData,
  wikiDataJSON,
}) {
  const {groupData, wikiInfo} = wikiData;

  await writeFavicon({
    mediaPath,
    outputPath,
  });

  return progressPromiseAll(`Writing files & pages shared across languages.`, [
    groupData?.some((group) => group.directory === 'fandom') &&
      redirect(
        'Fandom - Gallery',
        'albums/fandom',
        'localized.groupGallery',
        'fandom'
      ),

    groupData?.some((group) => group.directory === 'official') &&
      redirect(
        'Official - Gallery',
        'albums/official',
        'localized.groupGallery',
        'official'
      ),

    wikiInfo.enableListings &&
      redirect(
        'Album Commentary',
        'list/all-commentary',
        'localized.commentaryIndex',
        ''
      ),

    wikiDataJSON &&
      writeFile(
        path.join(outputPath, 'data.json'),
        wikiDataJSON),
  ].filter(Boolean));

  async function redirect(title, from, urlKey, directory) {
    const target = path.relative(
      from,
      urls.from('shared.root').to(urlKey, directory)
    );
    const content = generateRedirectHTML(title, target, {language});
    await mkdir(path.join(outputPath, from), {recursive: true});
    await writeFile(path.join(outputPath, from, 'index.html'), content);
  }
}
