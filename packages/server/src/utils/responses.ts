/**
 * Helper functions for API responses
 */

import { HttpError } from "@testcrate/core";

/**
 * Creates a JSON response with proper headers
 * @param data The data to serialize as JSON
 * @param status HTTP status code
 * @returns Response object
 */
export const jsonResponse = (data: any, status = 200): Response => {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

/**
 * Creates an error response
 * @param message Error message
 * @param status HTTP status code
 * @returns Response object
 */
export const errorResponse = (error: unknown, statusCode = 400): Response => {
  const message = error instanceof Error ? error.message : `${error}`;
  const status = error instanceof HttpError ? error.statusCode : statusCode;
  return new Response(JSON.stringify({ success: false, error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};
