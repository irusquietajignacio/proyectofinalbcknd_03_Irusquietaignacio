import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

function createFakeRepository(overrides = {}) {
  const calls = { list: 0, findById: [], create: [], removeByPair: [] };
  const repository = {
    calls,
    async list() {
      calls.list += 1;
      return [{ id: "adoption-1", userId: "user-1", petId: "pet-1" }];
    },
    async findById(id) {
      calls.findById.push(id);
      return id === "adoption-1"
        ? { id, userId: "user-1", petId: "pet-1" }
        : null;
    },
    async create(input) {
      calls.create.push(input);
      return { id: "adoption-2", ...input };
    },
    async removeByPair(userId, petId) {
      calls.removeByPair.push({ userId, petId });
      return userId === "user-1" && petId === "pet-1";
    },
    ...overrides,
  };
  return repository;
}

test("GET /api/adoptions returns all adoptions", async () => {
  const repository = createFakeRepository();
  const response = await request(createApp({ repository })).get(
    "/api/adoptions",
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.payload, [
    { id: "adoption-1", userId: "user-1", petId: "pet-1" },
  ]);
  assert.equal(repository.calls.list, 1);
});

test("GET /api/adoptions handles repository failures", async () => {
  const repository = createFakeRepository({
    list: async () => {
      throw new Error("database unavailable");
    },
  });
  const response = await request(createApp({ repository })).get(
    "/api/adoptions",
  );

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    status: "error",
    error: "Internal server error",
  });
});

test("GET /api/adoptions/:aid returns one adoption", async () => {
  const repository = createFakeRepository();
  const response = await request(createApp({ repository })).get(
    "/api/adoptions/adoption-1",
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.payload.id, "adoption-1");
  assert.deepEqual(repository.calls.findById, ["adoption-1"]);
});

test("GET /api/adoptions/:aid returns 404 for an unknown adoption", async () => {
  const response = await request(
    createApp({ repository: createFakeRepository() }),
  ).get("/api/adoptions/missing");

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "Adoption not found");
});

test("POST /api/adoptions/:uid/:pid creates an adoption", async () => {
  const repository = createFakeRepository();
  const response = await request(createApp({ repository })).post(
    "/api/adoptions/user-1/pet-2",
  );

  assert.equal(response.status, 201);
  assert.deepEqual(response.body.payload, {
    id: "adoption-2",
    userId: "user-1",
    petId: "pet-2",
  });
  assert.deepEqual(repository.calls.create, [
    { userId: "user-1", petId: "pet-2" },
  ]);
});

test("POST /api/adoptions/:uid/:pid maps missing user or pet to 404", async () => {
  const error = Object.assign(new Error("Pet not found"), {
    code: "PET_NOT_FOUND",
  });
  const repository = createFakeRepository({
    create: async () => {
      throw error;
    },
  });
  const response = await request(createApp({ repository })).post(
    "/api/adoptions/user-1/missing-pet",
  );

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "Pet not found");
});

test("POST /api/adoptions/:uid/:pid maps duplicates to 409", async () => {
  const error = Object.assign(new Error("Adoption already exists"), {
    code: "DUPLICATE_ADOPTION",
  });
  const repository = createFakeRepository({
    create: async () => {
      throw error;
    },
  });
  const response = await request(createApp({ repository })).post(
    "/api/adoptions/user-1/pet-1",
  );

  assert.equal(response.status, 409);
  assert.equal(response.body.error, "Adoption already exists");
});

test("DELETE /api/adoptions/:uid/:pid removes an adoption", async () => {
  const repository = createFakeRepository();
  const response = await request(createApp({ repository })).delete(
    "/api/adoptions/user-1/pet-1",
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.message, "Adoption removed");
  assert.deepEqual(repository.calls.removeByPair, [
    { userId: "user-1", petId: "pet-1" },
  ]);
});

test("DELETE /api/adoptions/:uid/:pid returns 404 when no adoption exists", async () => {
  const response = await request(
    createApp({ repository: createFakeRepository() }),
  ).delete("/api/adoptions/user-9/pet-9");

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "Adoption not found");
});

test("DELETE /api/adoptions/:uid/:pid handles repository failures", async () => {
  const repository = createFakeRepository({
    removeByPair: async () => {
      throw new Error("database unavailable");
    },
  });
  const response = await request(createApp({ repository })).delete(
    "/api/adoptions/user-1/pet-1",
  );

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    status: "error",
    error: "Internal server error",
  });
});
