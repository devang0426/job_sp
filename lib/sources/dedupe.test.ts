import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateDedupeKey,
  extractCompanyKey,
  extractTitleKey,
  extractLocationKey,
} from "./dedupe";

test("dedupe: corporate suffix stripping produces identical company key and dedupe key", () => {
  const key1 = generateDedupeKey({
    company: "Acme Inc.",
    title: "Software Engineer",
    location: "Bengaluru",
  });
  const key2 = generateDedupeKey({
    company: "Acme",
    title: "Software Engineer",
    location: "Bengaluru",
  });

  assert.equal(extractCompanyKey("Acme Inc."), "acme");
  assert.equal(extractCompanyKey("Acme"), "acme");
  assert.equal(key1, key2);
});

test("dedupe: seniority tokens are preserved and produce different dedupe keys", () => {
  const seniorKey = generateDedupeKey({
    company: "Acme",
    title: "Senior Engineer",
    location: "Bengaluru",
  });
  const juniorKey = generateDedupeKey({
    company: "Acme",
    title: "Engineer",
    location: "Bengaluru",
  });

  assert.equal(extractTitleKey("Senior Engineer"), "senior engineer");
  assert.equal(extractTitleKey("Engineer"), "engineer");
  assert.notEqual(seniorKey, juniorKey);
});

test("dedupe: location city normalization handles state/country suffixes", () => {
  const key1 = generateDedupeKey({
    company: "Acme",
    title: "Software Engineer",
    location: "Bengaluru, KA",
  });
  const key2 = generateDedupeKey({
    company: "Acme",
    title: "Software Engineer",
    location: "Bengaluru",
  });

  assert.equal(
    extractLocationKey({ location: "Bengaluru, KA" }),
    "bengaluru"
  );
  assert.equal(extractLocationKey({ location: "Bengaluru" }), "bengaluru");
  assert.equal(key1, key2);
});

test("dedupe: remote posting with no city keys as remote", () => {
  const remoteKey = generateDedupeKey({
    company: "Acme",
    title: "Software Engineer",
    isRemote: true,
  });

  assert.equal(extractLocationKey({ isRemote: true }), "remote");
  assert.equal(
    extractLocationKey({ location: "", isRemote: true }),
    "remote"
  );

  const nonRemoteKey = generateDedupeKey({
    company: "Acme",
    title: "Software Engineer",
    isRemote: false,
  });

  assert.notEqual(remoteKey, nonRemoteKey);
});
