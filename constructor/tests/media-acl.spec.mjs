import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
import { createApp } from "../server/index.mjs";
import { project, template } from "../shared/catalog.js";
import { id, hash } from "../server/util.mjs";
import { encrypt, inspectPackage } from "../server/transfer.mjs";
test("a forged material reference never grants foreign file access; an authorized copy retains its own media after sharing is revoked", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "constructor-acl-")),
    f = createApp({ storageDir: root });
  t.after(async () => {
    await f.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const owner = { id: "owner-a", role: "owner" },
    teacher = { id: "teacher-b", role: "teacher" },
    mid = id("media"),
    relativePath = "media/" + mid + ".png",
    bytes = Buffer.from("private owner media");
  fs.writeFileSync(path.join(root, relativePath), bytes);
  const media = f.store.put("media", mid, owner.id, {
    relativePath,
    mime: "image/png",
    sha256: hash(bytes),
    url: "/api/constructor/v1/media/" + mid,
  });
  const p = project("Исходный материал");
  p.cover = media.url;
  const saved = f.service.createProject(owner, { project: p });
  assert.equal(f.service.mediaReadable(teacher, media), false);
  assert.throws(
    () => f.service.createProject(teacher, { project: p }),
    (e) => e.code === "media_forbidden",
  );
  const forged = template();
  forged.backgroundImage = media.url;
  await assert.rejects(
    f.documents.render(forged, {}, { user: teacher }),
    (e) => e.code === "media_forbidden",
  );
  assert.throws(
    () => f.service.createTemplate(teacher, forged),
    (e) => e.code === "media_forbidden",
  );
  const fake = f.store.put("project", id("project"), teacher.id, {
    ...p,
    sharedWith: [],
  });
  assert.ok(fake);
  assert.equal(f.service.mediaReadable(teacher, media), false);
  const shared = { ...saved, sharedWith: [teacher.id] };
  f.store.put("project", saved.id, owner.id, shared);
  assert.equal(f.service.mediaReadable(teacher, media), true);
  const copy = f.service.createProject(teacher, { project: shared });
  assert.notEqual(copy.cover, media.url);
  const copied = f.store.get("media", copy.cover.split("/").at(-1));
  assert.equal(copied.owner, teacher.id);
  assert.deepEqual(
    fs.readFileSync(path.join(root, copied.relativePath)),
    bytes,
  );
  f.store.put("project", saved.id, owner.id, { ...saved, sharedWith: [] });
  assert.equal(f.service.mediaReadable(teacher, media), false);
  assert.equal(f.service.mediaReadable(teacher, copied), true);
  assert.deepEqual(fs.readFileSync(path.join(root, relativePath)), bytes);
});
test("package records cannot point at existing foreign documents without carrying their verified bytes", (t) => {
  const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "constructor-package-acl-"),
    ),
    f = createApp({ storageDir: root });
  t.after(async () => {
    await f.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const manifest = {
    version: 1,
    kind: "results",
    sourceInstance: "test",
    records: [
      {
        kind: "issue",
        value: {
          id: id("issue"),
          relativePath: "documents/foreign.pdf",
          sha256: hash("foreign"),
        },
      },
    ],
    files: {},
  };
  const bytes = encrypt(
    zipSync({ "manifest.json": strToU8(JSON.stringify(manifest)) }),
    "Package-test-123",
  );
  assert.throws(
    () =>
      inspectPackage(
        f.service,
        { id: "teacher-b", role: "teacher" },
        bytes,
        "Package-test-123",
      ),
    /собственный проверенный файл/,
  );
});
