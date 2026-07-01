import { describe, expect, it } from "vitest";
import { requestHeaders } from "./api";

describe("request headers", () => {
  it("does not declare JSON for bodyless delete requests", () => {
    const headers = requestHeaders({ method: "DELETE" }, "admin-token");

    expect(headers.get("content-type")).toBeNull();
    expect(headers.get("authorization")).toBe("Bearer admin-token");
  });

  it("declares JSON when a request has a body", () => {
    const headers = requestHeaders({ method: "POST", body: "{}" });

    expect(headers.get("content-type")).toBe("application/json");
  });
});
