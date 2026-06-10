"use strict";

const { ensurePm01VoiceAudioStorage } = require("../src/ydb-store");

(async () => {
  await ensurePm01VoiceAudioStorage();
  console.log("PM01 voice audio table is ready.");
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
