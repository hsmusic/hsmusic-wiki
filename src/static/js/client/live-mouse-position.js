/* eslint-env browser */

export const info = {
  id: 'liveMousePositionInfo',

  state: {
    clientX: null,
    clientY: null,
  },
};

export function addPageListeners() {
  const {state} = info;

  document.body.addEventListener('mousemove', domEvent => {
    Object.assign(state, {
      clientX: domEvent.clientX,
      clientY: domEvent.clientY,
    });
  });
}
