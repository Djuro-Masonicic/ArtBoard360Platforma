// Full web build without overwriting the active Next development .next folder.
const fs = require("fs"),
  path = require("path"),
  { execFileSync } = require("child_process");
const root = path.resolve(__dirname, "../../.."),
  dir = path.join(root, ".tmp", "web-build-" + Date.now());
fs.mkdirSync(dir, { recursive: true });
fs.cpSync(path.join(root, "apps/web/app"), path.join(dir, "app"), {
  recursive: true,
});
fs.appendFileSync(
  path.join(dir, "app/globals.css"),
  `\n@source "../../../apps/web";\n`,
);
fs.writeFileSync(
  path.join(dir, "package.json"),
  JSON.stringify({ private: true }),
);
fs.writeFileSync(
  path.join(dir, "tsconfig.json"),
  JSON.stringify({
    extends: "../../apps/web/tsconfig.json",
    compilerOptions: {
      baseUrl: "../../apps/web",
      paths: { "@/*": ["./*"] },
      incremental: false,
    },
    include: ["app/**/*.ts", "app/**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  }),
);
fs.writeFileSync(
  path.join(dir, "next.config.js"),
  `const path=require('path');module.exports={reactStrictMode:true,experimental:{externalDir:true},webpack(c){c.resolve.alias['@']=path.resolve(__dirname,'../../apps/web');return c}}`,
);
fs.copyFileSync(
  path.join(root, "apps/web/postcss.config.mjs"),
  path.join(dir, "postcss.config.mjs"),
);
const env = {
  ...process.env,
  ...require("dotenv").parse(fs.readFileSync(path.join(root, ".env"))),
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
};
console.log("Isolated full web build:", dir);
execFileSync(
  process.execPath,
  [path.join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"],
  { cwd: dir, env, stdio: "inherit" },
);
