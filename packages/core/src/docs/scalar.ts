export const generateScalarHtml = (specUrl: string) => {
    return `
    <!doctype html>
    <html>
      <head>
        <title>Tritio API Reference</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>body { margin: 0; }</style>
        <link href="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.43.4/dist/style.min.css" rel="stylesheet">
      </head>
      <body>
        <script
          id="api-reference"
          data-url="${specUrl}">
        </script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.43.4/dist/browser/standalone.min.js"></script>
      </body>
    </html>
    `;
};
