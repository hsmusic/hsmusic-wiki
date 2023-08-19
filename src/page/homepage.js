export const description = `main wiki homepage`;

export function pathsTargetless({wikiData}) {
  return [
    {
      type: 'page',
      path: ['home'],

      contentFunction: {
        name: 'generateWikiHomePage',
        args: [wikiData.homepageLayout],
      },
    },
  ];
}
