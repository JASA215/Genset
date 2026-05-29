/* GenSet build: compiles app.src.jsx -> plain JS, inlines React, writes index.html.
 * No Babel or React CDN needed at runtime — the app loads precompiled.
 *
 * Usage (from this folder):
 *   npm install react@18 react-dom@18 @babel/core @babel/preset-react
 *   node build.js
 *
 * Inputs : shell.html (HTML skeleton with <!--REACT--> and <!--APP--> markers)
 *          app.src.jsx (the editable React source — THIS is the file to edit)
 * Output : index.html (deploy this + the icon-*.png files)
 */
const fs = require("fs");
const babel = require("@babel/core");

function findReactUmd(pkg, file) {
  const candidates = [
    `node_modules/${pkg}/umd/${file}`,
    `/tmp/node_modules/${pkg}/umd/${file}`,
  ];
  for (const p of candidates) if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  throw new Error(`Could not find ${pkg}/umd/${file} — run npm install react@18 react-dom@18`);
}

// 1) Compile JSX -> classic React.createElement calls (uses the global React)
const jsx = fs.readFileSync("app.src.jsx", "utf8");
const { code } = babel.transformSync(jsx, {
  presets: [["@babel/preset-react", {
    runtime: "classic",
    pragma: "React.createElement",
    pragmaFrag: "React.Fragment",
  }]],
  compact: false,
  comments: false,
  filename: "app.src.jsx",
});

// 2) Read React UMD production builds (inlined so we don't depend on a CDN)
const react = findReactUmd("react", "react.production.min.js");
const reactDom = findReactUmd("react-dom", "react-dom.production.min.js");

// 3) Assemble. Inserted via concatenation (not template literals) so any
//    backticks inside the compiled app code can't break the build.
const shell = fs.readFileSync("shell.html", "utf8");
const reactBlock =
  "<script>" + react + "</script>\n" +
  "<script>" + reactDom + "</script>";
const appBlock = "<script>\n" + code + "\n</script>";

const out = shell
  .replace("<!--REACT-->", reactBlock)
  .replace("<!--APP-->", appBlock);

fs.writeFileSync("index.html", out);
console.log("index.html written:", out.length, "bytes");
