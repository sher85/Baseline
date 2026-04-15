import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { createOpenApiDocument } from "./spec.js";

const outputPath = resolve(process.cwd(), "openapi/openapi.json");

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(createOpenApiDocument(), null, 2)}\n`);

console.log(`Wrote OpenAPI spec to ${outputPath}`);
