import { afterAll, describe, expect, test } from "vitest";
import request from "supertest";
import backend from "../../../backend/index.js";
import db from "../../../backend/db.js";

const { app, isValidEmail } = backend;
const { pool } = db;

describe("backend validation unit tests", () => {
  afterAll(async () => {
    await pool.end();
  });

  test("accepts valid email formats", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("first.last+tag@sub.example.org")).toBe(true);
  });

  test("rejects invalid email formats", () => {
    expect(isValidEmail("missing-at-symbol")).toBe(false);
    expect(isValidEmail("missing-domain@")).toBe(false);
    expect(isValidEmail("@missing-local-part.com")).toBe(false);
  });

  test("health endpoint returns ok without a database dependency", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  test("submit endpoint rejects missing fields before database insert", async () => {
    const response = await request(app)
      .post("/submit")
      .send({ name: "Ada Lovelace", email: "ada@example.com" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("name, email, and message are required");
  });

  test("submit endpoint rejects invalid email before database insert", async () => {
    const response = await request(app)
      .post("/submit")
      .send({
        name: "Grace Hopper",
        email: "not-an-email",
        message: "Need dispatch support"
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("email is invalid");
  });
});
