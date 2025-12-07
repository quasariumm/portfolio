// @ts-ignore
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import rehypeFigureTitle from "rehype-figure-title"
import { rehypeAccessibleEmojis } from 'rehype-accessible-emojis'
import { remarkReadingTime } from './src/plugins/remark-reading-time.mjs'
import { remarkModifiedTime } from './src/plugins/remark-modified-time.mjs'
import remarkMath from 'remark-math';
import rehypeMathJax from 'rehype-mathjax';
import icon from 'astro-icon';
import serviceWorker from 'astrojs-service-worker';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
    integrations: [
        icon(),
        sitemap({
            changefreq: 'weekly',
            priority: 0.7,
            lastmod: new Date(),
            customPages: [],
            filter: (page) => !page.includes('/og/'), // Exclude OG images from sitemap
        }),
        serviceWorker(),
    ],

    markdown: {
        remarkPlugins: [remarkReadingTime, remarkModifiedTime, remarkMath],
		rehypePlugins: [rehypeFigureTitle, rehypeAccessibleEmojis, rehypeMathJax],

        syntaxHighlight: 'shiki',
        shikiConfig: {
            themes: {
                light: 'catppuccin-frappe',
                dark: 'catppuccin-mocha'
            }
        }
    },

    site: 'http://localhost:4321',

    output: 'server',

    adapter: node({
	mode: 'middleware',
    }),

    vite: {
        plugins: [tailwindcss()],
    }
});
