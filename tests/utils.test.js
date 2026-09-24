"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");

const { parseBody } = require("../src/utils");

function requestForJson(value) {
  const body = Buffer.from(value, "utf8");
  const request = Readable.from([body]);
  request.headers = { "content-length": String(body.length) };
  return request;
}

test("parseBody accepts a JSON object and rejects other top-level JSON values", async () => {
  assert.deepEqual(await parseBody(requestForJson('{"answer":42}')), { answer: 42 });

  for (const value of ["null", "[]", '"text"', "17", "true"]) {
    await assert.rejects(
      parseBody(requestForJson(value)),
      (error) => error.statusCode === 400 && /JSON-объектом/.test(error.message)
    );
  }
});
