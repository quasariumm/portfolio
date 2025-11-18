import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

const blog = defineCollection({
    loader: glob({
        base: './src/content/blog',
        pattern: '**/*.{md,mdx}',
    }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		coverImageCredit: z.string().optional(),
		category: z.string().default('Uncategorized'),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
	}),
})

const projects = defineCollection({
	loader: glob({
		base: './src/content/projects',
		pattern: '**/*.{md,mdx}'
	}),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		releaseDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		coverImageCredit: z.string().optional(),
		category: z.string().default('Uncategorized'),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
		// Links
		link_github: z.string().optional(),
		link_itch: z.string().optional(),
		link_steam: z.string().optional(),
		// Game-specific
		version: z.string().optional(),
		language: z.string().optional(),
		engine: z.string().optional(),
		authors: z.string().array().optional(),
	})
})

export const collections = { blog, projects }