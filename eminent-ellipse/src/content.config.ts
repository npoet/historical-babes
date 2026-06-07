// src/content.config.ts

import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const figures = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/figures",
  }),

  schema: z.object({
    name: z.string(),

    lifespan: z.string().optional(),
    nationality: z.string().optional(),
    occupation: z.string().optional(),
    era: z.string().optional(),

    image: z.object({
      src: z.string(),
      alt: z.string(),
    }),

    importantWorks: z.array(z.string()).optional(),

    references: z
      .array(
        z.object({
          title: z.string(),
          url: z.string().url(),
        })
      )
      .optional(),
  }),
});

export const collections = {
  figures,
};