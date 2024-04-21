const fs = require("fs");
const { v4: uuid } = require("uuid");

const createTodo = (text) => ({ id: uuid(), text });

const loadTemplate = (name) =>
  fs.readFileSync(`./templates/${name}.mustache`, "utf8");

const loadPartial = (name) =>
  fs.readFileSync(`./partials/${name}.mustache`, "utf8");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  createTodo,
  loadTemplate,
  loadPartial,
  wait,
};
