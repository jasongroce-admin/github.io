import { r as getReact, jrsReactDomClient } from "./index-site.js";
import { component as JrsPlumbingGame } from "./routes-site.js";

const React = getReact();

const mount = document.getElementById("jrs-plumbing-root");

if (!mount) {
  throw new Error("JR's Plumbing could not find its game mount.");
}

jrsReactDomClient.hydrateRoot(
  mount,
  React.createElement(React.StrictMode, null, React.createElement(JrsPlumbingGame)),
);
