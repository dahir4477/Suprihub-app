import pg from "pg";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
const databaseConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "passWrd",
  database: process.env.DB_NAME || "dispatchdb"
};

const uniqueEmail = `integration.${Date.now()}@example.com`;
let pool;

describe("service stack integration tests", () => {
  beforeAll(async () => {
    pool = new pg.Pool(databaseConfig);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  });

  afterAll(async () => {
    if (pool) {
      await pool.query("DELETE FROM submissions WHERE email = $1", [uniqueEmail]);
      await pool.end();
    }
  });

  test("backend health endpoint is reachable", async () => {
    const response = await fetch(`${backendUrl}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  test("backend writes a valid UI submission into PostgreSQL", async () => {
    const payload = {
      name: "Integration Tester",
      email: uniqueEmail,
      message: "Verify backend and database integration."
    };

    const response = await fetch(`${backendUrl}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      message: "Dispatch request submitted successfully."
    });

    const result = await pool.query(
      "SELECT name, email, message FROM submissions WHERE email = $1",
      [uniqueEmail]
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: payload.name,
      email: payload.email,
      message: payload.message
    });
  });
});
