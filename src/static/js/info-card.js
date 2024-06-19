/* eslint-env browser */

// Note: This is a super ancient chunk of code which isn't actually in use,
// so it's just commented out here.

/*
function colorLink(a, color) {
  console.warn('Info card link colors temporarily disabled: chroma.js required, no dependency linking for client.js yet');
  return;

  // eslint-disable-next-line no-unreachable
  const chroma = {};

  if (color) {
    const {primary, dim} = getColors(color, {chroma});
    a.style.setProperty('--primary-color', primary);
    a.style.setProperty('--dim-color', dim);
  }
}

function link(a, type, {name, directory, color}) {
  colorLink(a, color);
  a.innerText = name;
  a.href = getLinkHref(type, directory);
}

function joinElements(type, elements) {
  // We can't use the Intl APIs with elements, 8ecuase it only oper8tes on
  // strings. So instead, we'll pass the element's outer HTML's (which means
  // the entire HTML of that element).
  //
  // That does mean this function returns a string, so always 8e sure to
  // set innerHTML when using it (not appendChild).

  return list[type](elements.map((el) => el.outerHTML));
}

const infoCard = (() => {
  const container = document.getElementById('info-card-container');

  let cancelShow = false;
  let hideTimeout = null;
  let showing = false;

  container.addEventListener('mouseenter', cancelHide);
  container.addEventListener('mouseleave', readyHide);

  function show(type, target) {
    cancelShow = false;

    fetchData(type, target.dataset[type]).then((data) => {
      // Manual DOM 'cuz we're laaaazy.

      if (cancelShow) {
        return;
      }

      showing = true;

      const rect = target.getBoundingClientRect();

      container.style.setProperty('--primary-color', data.color);

      container.style.top = window.scrollY + rect.bottom + 'px';
      container.style.left = window.scrollX + rect.left + 'px';

      // Use a short timeout to let a currently hidden (or not yet shown)
      // info card teleport to the position set a8ove. (If it's currently
      // shown, it'll transition to that position.)
      setTimeout(() => {
        container.classList.remove('hide');
        container.classList.add('show');
      }, 50);

      // 8asic details.

      const nameLink = container.querySelector('.info-card-name a');
      link(nameLink, 'track', data);

      const albumLink = container.querySelector('.info-card-album a');
      link(albumLink, 'album', data.album);

      const artistSpan = container.querySelector('.info-card-artists span');
      artistSpan.innerHTML = joinElements(
        'conjunction',
        data.artists.map(({artist}) => {
          const a = document.createElement('a');
          a.href = getLinkHref('artist', artist.directory);
          a.innerText = artist.name;
          return a;
        })
      );

      const coverArtistParagraph = container.querySelector(
        '.info-card-cover-artists'
      );
      const coverArtistSpan = coverArtistParagraph.querySelector('span');
      if (data.coverArtists.length) {
        coverArtistParagraph.style.display = 'block';
        coverArtistSpan.innerHTML = joinElements(
          'conjunction',
          data.coverArtists.map(({artist}) => {
            const a = document.createElement('a');
            a.href = getLinkHref('artist', artist.directory);
            a.innerText = artist.name;
            return a;
          })
        );
      } else {
        coverArtistParagraph.style.display = 'none';
      }

      // Cover art.

      const [containerNoReveal, containerReveal] = [
        container.querySelector('.info-card-art-container.no-reveal'),
        container.querySelector('.info-card-art-container.reveal'),
      ];

      const [containerShow, containerHide] = data.cover.warnings.length
        ? [containerReveal, containerNoReveal]
        : [containerNoReveal, containerReveal];

      containerHide.style.display = 'none';
      containerShow.style.display = 'block';

      const img = containerShow.querySelector('.info-card-art');
      img.src = rebase(data.cover.paths.small, 'rebaseMedia');

      const imgLink = containerShow.querySelector('a');
      colorLink(imgLink, data.color);
      imgLink.href = rebase(data.cover.paths.original, 'rebaseMedia');

      if (containerShow === containerReveal) {
        const cw = containerShow.querySelector('.info-card-art-warnings');
        cw.innerText = list.unit(data.cover.warnings);

        const reveal = containerShow.querySelector('.reveal');
        reveal.classList.remove('revealed');
      }
    });
  }

  function hide() {
    container.classList.remove('show');
    container.classList.add('hide');
    cancelShow = true;
    showing = false;
  }

  function readyHide() {
    if (!hideTimeout && showing) {
      hideTimeout = setTimeout(hide, HIDE_HOVER_DELAY);
    }
  }

  function cancelHide() {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  return {
    show,
    hide,
    readyHide,
    cancelHide,
  };
})();

// Info cards are disa8led for now since they aren't quite ready for release,
// 8ut you can try 'em out 8y setting this localStorage flag!
//
//     localStorage.tryInfoCards = true;
//
if (localStorage.tryInfoCards) {
  addInfoCardLinkHandlers('track');
}
*/

