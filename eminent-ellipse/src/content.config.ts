// src/content.config.ts

import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const factStatusSchema = z.enum(["reviewed", "approximate", "needs-source"]);
const sourceStrengthSchema = z.enum(["strong", "partial", "needs-review"]);
const contextLayerSchema = z.enum(["personal", "impact", "world"]);
const contextImportanceSchema = z.enum(["major", "supporting"]);
const sourceTypeSchema = z.enum([
  "primary",
  "archive",
  "museum",
  "book",
  "article",
  "reference",
  "authority",
]);
const sourceSupportSchema = z.string().trim().min(1);
const connectionReasonSchema = z.string().trim().min(1);

const placeSchema = z.object({
  name: z.string(),
  type: z
    .enum(["birth", "death", "lived", "worked", "studied", "active", "event"])
    .optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  startYear: z.number().int().optional(),
  endYear: z.number().int().optional(),
  note: z.string().optional(),
  status: factStatusSchema.optional(),
  source: z.string().url().optional(),
});

const contextEventSchema = z.object({
  label: z.string(),
  layer: contextLayerSchema.optional(),
  thread: z.string().optional(),
  importance: contextImportanceSchema.optional(),
  year: z.number().int().optional(),
  startYear: z.number().int().optional(),
  endYear: z.number().int().optional(),
  place: z.string().optional(),
  note: z.string().optional(),
  status: factStatusSchema.optional(),
  source: z.string().url().optional(),
});

const importantWorkSchema = z.union([
  z.string(),
  z.object({
    title: z.string(),
    year: z.number().int().optional(),
    startYear: z.number().int().optional(),
    endYear: z.number().int().optional(),
    place: z.string().optional(),
    note: z.string().optional(),
    status: factStatusSchema.optional(),
    source: z.string().url().optional(),
  }),
]);

const storySeedSchema = z.object({
  title: z.string(),
  year: z.number().int().optional(),
  startYear: z.number().int().optional(),
  endYear: z.number().int().optional(),
  prompt: z.string(),
  note: z.string().optional(),
  status: factStatusSchema,
  source: z.string().url().optional(),
});

const figureSchema = z.object({
  name: z.string(),

  summary: z.string().optional(),
  lifespan: z.string().optional(),
  birthYear: z.number().int().optional(),
  deathYear: z.number().int().optional(),
  nationality: z.string().optional(),
  nationalities: z.array(z.string()).optional(),
  occupation: z.string().optional(),
  occupations: z.array(z.string()).optional(),
  era: z.string().optional(),
  eras: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
  sourceCredit: z.string().optional(),
  sourceCoverageStatus: factStatusSchema.optional(),
  sourceStrength: sourceStrengthSchema.optional(),
  openQuestions: z.array(z.string()).optional(),
  originalInstagramUrl: z.string().url().optional(),
  draft: z.boolean().optional(),
  reviewed: z.boolean().optional(),
  dateStatus: factStatusSchema.optional(),

  places: z.array(placeSchema).optional(),
  contextEvents: z.array(contextEventSchema).optional(),

  image: z.object({
    src: z.string(),
    alt: z.string(),
  }),

  importantWorks: z.array(importantWorkSchema).optional(),
  storySeeds: z.array(storySeedSchema).optional(),
  relatedConnections: z
    .array(
      z.object({
        id: z.string(),
        reasons: z.array(connectionReasonSchema).optional(),
        note: z.string().optional(),
      })
    )
    .optional(),

  references: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        type: sourceTypeSchema.optional(),
        supports: z.array(sourceSupportSchema).optional(),
        status: factStatusSchema.optional(),
        note: z.string().optional(),
        authorityId: z.string().optional(),
        authorityUrl: z.string().url().optional(),
      })
    )
    .optional(),
});

const figures = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/figures",
  }),

  schema: figureSchema,
});

const figureDrafts = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/drafts/figures",
  }),

  schema: figureSchema.extend({
    draft: z.literal(true),
    reviewed: z.literal(false),
  }),
});

export const collections = {
  figures,
  figureDrafts,
};
