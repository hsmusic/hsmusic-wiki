import {filterMultipleArrays, stitchArrays, unique}
  from '../../shared-util/sugar.js';

import {dispatchInternalEvent} from '../client-util.js';

export const info = {
  id: 'hashLinkInfo',

  links: null,
  hrefs: null,
  targets: null,

  details: null,
  detailsIDs: null,

  state: {
    highlightedTarget: null,
    scrollingAfterClick: false,
    concludeScrollingStateInterval: null,
  },

  event: {
    beforeHashLinkScrolls: [],
    whenHashLinkClicked: [],
  },
};

export function getPageReferences() {
  info.links =
    Array.from(document.querySelectorAll('a[href^="#"]:not([href="#"])'));

  info.hrefs =
    info.links
      .map(link => link.getAttribute('href'));

  info.targets =
    info.hrefs
      .map(href => document.getElementById(href.slice(1)));

  filterMultipleArrays(
    info.links,
    info.hrefs,
    info.targets,
    (_link, _href, target) => target);

  info.details =
    unique([
      ...document.querySelectorAll('details[id]'),
      ...
        Array.from(document.querySelectorAll('summary[id]'))
          .map(summary => summary.closest('details')),
    ]);

  info.detailsIDs =
    info.details.map(details =>
      details.id ||
      details.querySelector('summary').id);
}

function processScrollingAfterHashLinkClicked() {
  const {state} = info;

  if (state.concludeScrollingStateInterval) return;

  let lastScroll = window.scrollY;
  state.scrollingAfterClick = true;
  state.concludeScrollingStateInterval = setInterval(() => {
    if (Math.abs(window.scrollY - lastScroll) < 10) {
      clearInterval(state.concludeScrollingStateInterval);
      state.scrollingAfterClick = false;
      state.concludeScrollingStateInterval = null;
    } else {
      lastScroll = window.scrollY;
    }
  }, 200);
}

export function mutatePageContent() {
  if (location.hash.length > 1) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) {
      expandDetails(target);
    }
  }
}

export function addPageListeners() {
  // Instead of defining a scroll offset (to account for the sticky heading)
  // in JavaScript, we interface with the CSS property 'scroll-margin-top'.
  // This lets the scroll offset be consolidated where it makes sense, and
  // sets an appropriate offset when (re)loading a page with hash for free!

  const {state, event} = info;

  for (const {hashLink, href, target} of stitchArrays({
    hashLink: info.links,
    href: info.hrefs,
    target: info.targets,
  })) {
    hashLink.addEventListener('click', evt => {
      if (evt.metaKey || evt.shiftKey || evt.ctrlKey || evt.altKey) {
        return;
      }

      // Don't do anything if the target element isn't actually visible!
      if (target.offsetParent === null) {
        return;
      }

      // Allow event handlers to prevent scrolling.
      const listenerResults =
        dispatchInternalEvent(event, 'beforeHashLinkScrolls', {
          link: hashLink,
          target,
        });

      if (listenerResults.includes(false)) {
        return;
      }

      // We're taking full responsibility for doing what a hash link is
      // supposed to do. Get ready for it!
      evt.preventDefault();

      const fromSkipperLink =
        !!evt.target.closest('#skippers');

      if (!fromSkipperLink) {
        history.pushState({}, '', href);
      }

      if (fromSkipperLink) {
        // Hide skipper box right away, so the layout is updated on time for the
        // math operations coming up next.
        const skipper = document.getElementById('skippers');
        skipper.style.display = 'none';
        setTimeout(() => skipper.style.display = '');
      }

      expandDetails(target);

      const box = target.getBoundingClientRect();
      const style = window.getComputedStyle(target);

      const scrollY =
          window.scrollY
        + box.top
        - style['scroll-margin-top'].replace('px', '');

      window.scrollTo({top: scrollY, behavior: 'smooth'});

      // Get grumpy.
      target.focus({preventScroll: true});
      if (document.activeElement !== target && !target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
        target.focus({preventScroll: true});
        if (document.activeElement !== target) {
          target.removeAttribute('tabindex');
          console.warn(`Couldn't focus target even after setting tabindex:`, target);
        }
      }

      const maxScroll =
          document.body.scrollHeight
        - window.innerHeight;

      if (scrollY > maxScroll && target.classList.contains('content-heading')) {
        if (state.highlightedTarget) {
          state.highlightedTarget.classList.remove('highlight-hash-link');
        }

        target.classList.add('highlight-hash-link');
        state.highlightedTarget = target;
      }

      processScrollingAfterHashLinkClicked();

      dispatchInternalEvent(event, 'whenHashLinkClicked', {
        link: hashLink,
        target,
      });
    });
  }

  for (const target of info.targets) {
    target.addEventListener('animationend', evt => {
      if (evt.animationName !== 'highlight-hash-link') return;
      target.classList.remove('highlight-hash-link');
      if (target !== state.highlightedTarget) return;
      state.highlightedTarget = null;
    });
  }

  stitchArrays({
    details: info.details,
    id: info.detailsIDs,
  }).forEach(({details, id}) => {
      details.addEventListener('toggle', () => {
        if (!details.open) {
          detractHash(id);
        }
      });
    });
}

function expandDetails(target) {
  if (target.nodeName === 'SUMMARY') {
    const details = target.closest('details');
    if (details) {
      details.open = true;
    }
  } else if (target.nodeName === 'DETAILS') {
    target.open = true;
  }
}

function detractHash(id) {
  if (location.hash === '#' + id) {
    history.pushState({}, undefined, location.href.replace(/#.*$/, ''));
  }
}
