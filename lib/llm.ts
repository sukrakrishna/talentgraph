import "server-only";
import { z } from "zod";
import { createHash } from "node:crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { supabaseAdmin } from "@/lib/supabase-admin";

const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || "gemini-2.5-flash";

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  if (!LLM_API_KEY) throw new Error("LLM_API_KEY is not set");
  if (!client) client = new GoogleGenAI({ apiKey: LLM_API_KEY });
  return client;
}

function hashKey(prompt: string, input: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify([LLM_MODEL, prompt, input ?? null]))
    .digest("hex");
}

type JsonSchemaNode = Record<string, unknown>;

const JSON_SCHEMA_TYPE_TO_GEMINI: Record<string, Type> = {
  string: Type.STRING,
  number: Type.NUMBER,
  integer: Type.INTEGER,
  boolean: Type.BOOLEAN,
  array: Type.ARRAY,
  object: Type.OBJECT,
  null: Type.NULL,
};

/**
 * Gemini's responseSchema is a restricted, non-standard subset of OpenAPI
 * (uppercase `Type` enum, no `$schema`/`additionalProperties`/`oneOf`/`const`,
 * string-typed min/max fields). This walks zod's own draft-2020-12 JSON Schema
 * output and reshapes it into that subset instead of re-deriving it from zod
 * internals directly.
 */
function convertJsonSchemaNode(node: JsonSchemaNode): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  let type = node.type;
  let nullable = false;
  if (Array.isArray(type)) {
    nullable = type.includes("null");
    type = type.find((t) => t !== "null");
  }
  if (typeof type === "string" && JSON_SCHEMA_TYPE_TO_GEMINI[type]) {
    out.type = JSON_SCHEMA_TYPE_TO_GEMINI[type];
  }
  if (nullable) out.nullable = true;

  if (typeof node.description === "string") out.description = node.description;
  if (typeof node.format === "string") out.format = node.format;

  if ("const" in node) {
    out.enum = [node.const];
  } else if (Array.isArray(node.enum)) {
    out.enum = node.enum;
  }

  if (typeof node.minimum === "number") out.minimum = node.minimum;
  if (typeof node.maximum === "number") out.maximum = node.maximum;
  if (typeof node.minLength === "number") out.minLength = String(node.minLength);
  if (typeof node.maxLength === "number") out.maxLength = String(node.maxLength);
  if (typeof node.minItems === "number") out.minItems = String(node.minItems);
  if (typeof node.maxItems === "number") out.maxItems = String(node.maxItems);

  if (node.items && typeof node.items === "object") {
    out.items = convertJsonSchemaNode(node.items as JsonSchemaNode);
  }

  if (node.properties && typeof node.properties === "object") {
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node.properties as Record<string, unknown>)) {
      properties[key] = convertJsonSchemaNode(value as JsonSchemaNode);
    }
    out.properties = properties;
    out.propertyOrdering = Object.keys(properties);
  }
  if (Array.isArray(node.required)) out.required = node.required;

  const anyOf = node.anyOf ?? node.oneOf;
  if (Array.isArray(anyOf)) {
    out.anyOf = anyOf.map((sub) => convertJsonSchemaNode(sub as JsonSchemaNode));
  }

  return out;
}

function zodToGeminiSchema(schema: z.ZodTypeAny): unknown {
  const jsonSchema = z.toJSONSchema(schema) as JsonSchemaNode;
  return convertJsonSchemaNode(jsonSchema);
}

async function callGemini(contents: string, responseSchema: unknown): Promise<string> {
  const response = await getClient().models.generateContent({
    model: LLM_MODEL,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema,
      thinkingConfig: { thinkingBudget: 0 },
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    const blockReason = response.promptFeedback?.blockReason;
    throw new Error(`Gemini returned no text${blockReason ? ` (blocked: ${blockReason})` : ""}`);
  }
  return text;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

/**
 * The single gateway for all LLM calls in the app. `prompt` gives the model its
 * instructions; `input`, if given, is the structured data to act on (serialized
 * into the request and folded into the cache key alongside the model and prompt).
 * Handles the model call, zod validation against a Gemini-shaped responseSchema
 * derived from `schema`, one automatic retry (with the validation error fed back
 * to the model), and a cache so repeat demo inputs return instantly.
 */
export async function generateJson<T extends z.ZodTypeAny>(
  schema: T,
  prompt: string,
  input?: unknown
): Promise<z.infer<T>> {
  const hash = hashKey(prompt, input);

  const { data: cached } = await supabaseAdmin
    .from("llm_cache")
    .select("json")
    .eq("hash", hash)
    .maybeSingle();
  if (cached) {
    const parsed = schema.safeParse(cached.json);
    if (parsed.success) return parsed.data;
  }

  const responseSchema = zodToGeminiSchema(schema);
  const baseContents = input === undefined ? prompt : `${prompt}\n\nInput:\n${JSON.stringify(input)}`;

  let lastError: unknown;
  let contents = baseContents;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await callGemini(contents, responseSchema);
      const raw = extractJson(text);
      const parsed = schema.parse(raw);
      await supabaseAdmin.from("llm_cache").upsert({ hash, json: parsed });
      return parsed;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      contents = `${baseContents}\n\nYour previous response was invalid: ${message}\nReturn ONLY valid JSON matching the requested shape — no prose, no markdown fences.`;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
