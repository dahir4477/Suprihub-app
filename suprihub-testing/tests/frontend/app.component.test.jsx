// @vitest-environment jsdom

import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../../frontend/src/App.jsx";

describe("frontend dispatch form component tests", () => {
  test("renders the dispatch request form", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /dispatch request form/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeEnabled();
  });

  test("submits form data to the backend API and clears the form on success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Dispatch request submitted successfully." })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await user.type(screen.getByLabelText(/name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/message/i), "Please dispatch a technician.");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(fetchMock).toHaveBeenCalledWith("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ada Lovelace",
        email: "ada@example.com",
        message: "Please dispatch a technician."
      })
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Dispatch request submitted successfully.");
    expect(screen.getByLabelText(/name/i)).toHaveValue("");
    expect(screen.getByLabelText(/email/i)).toHaveValue("");
    expect(screen.getByLabelText(/message/i)).toHaveValue("");
  });

  test("shows backend validation errors to the user", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "email is invalid" })
    }));

    render(<App />);

    await user.type(screen.getByLabelText(/name/i), "Grace Hopper");
    await user.type(screen.getByLabelText(/email/i), "grace@example.com");
    await user.type(screen.getByLabelText(/message/i), "Need routing support.");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("email is invalid");
  });
});
