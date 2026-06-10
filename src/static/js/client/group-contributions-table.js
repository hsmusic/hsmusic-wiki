import {cssProp} from '../client-util.js';
import {stitchArrays} from '../../shared-util/sugar.js';

export const info = {
  id: 'groupContributionsInfo',

  tables: null,
  lists: null,

  groupLinks: null,
  groupLinkDirectories: null,

  chunkDTs: null,
  chunkDDs: null,
  chunkGroupDirectories: null,

  filterNotices: null,
  filterNoticeClearLinks: null,
};

export function getPageReferences() {
  if (document.documentElement.dataset.urlKey !== 'localized.artist') {
    return;
  }

  info.tables =
    Array.from(document.querySelectorAll('.group-contributions-table'));

  info.lists =
    info.tables
      .map(table => table.closest('dl'));

  info.groupLinks =
    info.tables
      .map(table => Array.from(table.querySelectorAll('td.group a')));

  info.groupLinkDirectories =
    info.groupLinks
      .map(links => links
        .map(link => link.dataset.directory));

  info.chunkDTs =
    info.lists
      .map(list => Array.from(list.querySelectorAll('dt')))
      .map(dts => dts
        .filter(dt => !dt.classList.contains('filter-notice')));

  info.chunkDDs =
    info.chunkDTs
      .map(dts => dts
        .map(dt => dt.nextElementSibling)
        .map(el => el?.tagName === 'DD' ? el : null));

  info.chunkGroupDirectories =
    info.chunkDTs
      .map(dts => dts
        .map(dt => dt.dataset.groups)
        .map(string => string ? string.split(' ') : []));

  info.filterNotices =
    info.lists
      .map(list => list.querySelector('.filter-notice'));

  info.filterNoticeClearLinks =
    info.filterNotices
      .map(notice => notice.querySelector('a'));
}

export function addPageListeners() {
  if (!info.tables) return;

  stitchArrays({
    table: info.tables,
    groupLinks: info.groupLinks,
  }).forEach(({table, groupLinks}) => {
      groupLinks.forEach(groupLink => {
        groupLink.addEventListener('click', domEvent => {
          domEvent.preventDefault();
          handleGroupLinkClicked(table, groupLink);
        });
      });
    });

  stitchArrays({
    table: info.tables,
    clearLink: info.filterNoticeClearLinks,
  }).forEach(({table, clearLink}) => {
      clearLink.addEventListener('click', domEvent => {
        domEvent.preventDefault();
        handleClearLinkClicked(table);
      });
    });
}

function handleGroupLinkClicked(table, groupLink) {
  const i = info.tables.indexOf(table);

  groupLink.classList.toggle('selected');

  // For now, just disable having more than one link selected at a time.
  for (const link of info.groupLinks[i]) {
    if (link !== groupLink) {
      link.classList.remove('selected');
    }
  }

  updateVisibleChunks(table);
}

function handleClearLinkClicked(table) {
  const i = info.tables.indexOf(table);

  for (const link of info.groupLinks[i]) {
    link.classList.remove('selected');
  }

  updateVisibleChunks(table);
}

function updateVisibleChunks(table) {
  const i = info.tables.indexOf(table);

  const selectedGroupDirectories =
    stitchArrays({
      link: info.groupLinks[i],
      directory: info.groupLinkDirectories[i],
    }).filter(({link}) => link.classList.contains('selected'))
      .map(({directory}) => directory);

  stitchArrays({
    chunkDT: info.chunkDTs[i],
    chunkDD: info.chunkDDs[i],
    chunkGroupDirectories: info.chunkGroupDirectories[i],
  }).forEach(({
      chunkDT,
      chunkDD,
      chunkGroupDirectories,
    }) => {
      if (selectedGroupDirectories.length >= 1) {
        const included =
          chunkGroupDirectories
            .some(d => selectedGroupDirectories.includes(d));

        if (included) {
          cssProp(chunkDT, 'display', null);
          cssProp(chunkDD, 'display', null);
        } else {
          cssProp(chunkDT, 'display', 'none');
          cssProp(chunkDD, 'display', 'none');
        }
      } else {
        cssProp(chunkDT, 'display', null);
        cssProp(chunkDD, 'display', null);
      }
    });

  const filterNotice = info.filterNotices[i];
  if (selectedGroupDirectories.length >= 1) {
    cssProp(filterNotice, 'display', null);
  } else {
    cssProp(filterNotice, 'display', 'none');
  }
}
