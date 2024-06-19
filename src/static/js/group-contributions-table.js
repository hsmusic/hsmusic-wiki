/* eslint-env browser */

// TODO: Update to clientSteps style.

const groupContributionsTableInfo =
  Array.from(document.querySelectorAll('#content dl'))
    .filter(dl => dl.querySelector('a.group-contributions-sort-button'))
    .map(dl => ({
      sortingByCountLink: dl.querySelector('dt.group-contributions-sorted-by-count a.group-contributions-sort-button'),
      sortingByDurationLink: dl.querySelector('dt.group-contributions-sorted-by-duration a.group-contributions-sort-button'),
      sortingByCountElements: dl.querySelectorAll('.group-contributions-sorted-by-count'),
      sortingByDurationElements: dl.querySelectorAll('.group-contributions-sorted-by-duration'),
    }));

function sortGroupContributionsTableBy(info, sort) {
  const [showThese, hideThese] =
    (sort === 'count'
      ? [info.sortingByCountElements, info.sortingByDurationElements]
      : [info.sortingByDurationElements, info.sortingByCountElements]);

  for (const element of showThese) element.classList.add('visible');
  for (const element of hideThese) element.classList.remove('visible');
}

for (const info of groupContributionsTableInfo) {
  info.sortingByCountLink.addEventListener('click', evt => {
    evt.preventDefault();
    sortGroupContributionsTableBy(info, 'duration');
  });

  info.sortingByDurationLink.addEventListener('click', evt => {
    evt.preventDefault();
    sortGroupContributionsTableBy(info, 'count');
  });
}
