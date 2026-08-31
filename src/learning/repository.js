"use strict";

const path = require("path");

let runtime = null;
let repositoryPromise = null;

function configureLearningRuntime(nextRuntime = {}) {
  const merged = { ...(runtime || {}), ...nextRuntime };
  const changed = !runtime || runtime.db !== merged.db || runtime.storageDir !== merged.storageDir;
  runtime = merged;
  if (changed) repositoryPromise = null;
}

function learningEnabled() {
  const value = runtime?.enabled ?? process.env.LEARNING_ENABLED ?? "true";
  return !["0", "false", "off", "disabled"].includes(String(value).trim().toLowerCase());
}

async function buildRepository() {
  if (runtime?.db) {
    const { D1LearningRepository } = require("./repositories/d1");
    return new D1LearningRepository(runtime.db).init();
  }
  const { FileLearningRepository } = require("./repositories/file");
  const storageDir = runtime?.storageDir || process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
  return new FileLearningRepository({ storageDir }).init();
}

async function getLearningRepository() {
  if (!repositoryPromise) repositoryPromise = buildRepository();
  return repositoryPromise;
}

function getLearningRuntime() {
  return runtime || {};
}

module.exports = {
  configureLearningRuntime,
  getLearningRepository,
  getLearningRuntime,
  learningEnabled
};
