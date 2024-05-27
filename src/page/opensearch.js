export const description = `opensearch description file`;

export function pathsTargetless() {
  return [
    {
      type: 'file',
      path: ['shared.openSearchDescription'],

      contentFunction: {
        name: 'generateOpenSearchDescription',
      },
    },
  ];
}
