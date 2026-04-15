import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { Router } from "express";

const openApiSpecPath = resolve(process.cwd(), "openapi/openapi.json");

function getRedocHtml(specUrl: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Baseline API Docs</title>
    <style>
      body {
        margin: 0;
        background: #f5f7f8;
      }

      #redoc-container {
        min-height: 100vh;
      }
    </style>
  </head>
  <body>
    <div id="redoc-container"></div>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
    <script>
      Redoc.init("${specUrl}", { expandResponses: "200,201" }, document.getElementById("redoc-container"));
    </script>
  </body>
</html>`;
}

export const openapiRouter = Router();

openapiRouter.get("/openapi/openapi.json", (_request, response) => {
  if (!existsSync(openApiSpecPath)) {
    response.status(404).json({
      error: "OpenAPI spec has not been generated yet. Run 'npm run openapi:generate'."
    });

    return;
  }

  response.sendFile(openApiSpecPath);
});

openapiRouter.get("/docs", (_request, response) => {
  response.type("html").send(getRedocHtml("/openapi/openapi.json"));
});
