// src/content.config.ts

import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const factStatusSchema = z.enum(["reviewed", "approximate", "needs-source"]);

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

const figureSchema = z.object({
  name: z.string(),

  summary: z.string().optional(),
  lifespan: z.string().optional(),
  birthYear: z.number().int().optional(),
  deathYear: z.number().int().optional(),
  nationality: z.string().optional(),
  occupation: z.string().optional(),
  occupations: z.array(z.string()).optional(),
  era: z.string().optional(),
  tags: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
  sourceCredit: z.string().optional(),
  sourceCoverageStatus: factStatusSchema.optional(),
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

  references: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url(),
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
