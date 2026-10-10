import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { errorHandler } from "./error-handler.js";

test("duplicate relationship errors return HTTP 409", () => {
  const originalError = console.error;
  console.error = () => undefined;
  let statusCode = 0;
  let responseBody: unknown;
  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    },
  } as unknown as Response;

  try {
    errorHandler(
      new Error("This relationship already exists between these entities."),
      {} as Request,
      response,
      (() => undefined) as NextFunction,
    );
  } finally {
    console.error = originalError;
  }

  assert.equal(statusCode, 409);
  assert.deepEqual(responseBody, {
    error: "This relationship already exists between these entities.",
    code: "RELATIONSHIP_ALREADY_EXISTS",
    message: "This relationship already exists between these entities.",
  });
});
