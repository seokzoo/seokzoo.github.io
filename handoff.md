# Handoff: Jekyll to Quartz Migration (Moving Theme)

## Background

The user is migrating their personal blog from Jekyll to Quartz v4 (`seokzoo.github.io` repository).
The goal is to keep their existing `_posts` content but **perfectly reproduce the UI/UX and CSS** of their original Jekyll theme: [moving](https://github.com/huangyz0918/moving).

## What has been done so far:

1. **Quartz Setup**: Initialized Quartz v4 in the root directory. Added `npm run dev` and `npm run build` scripts. Modified `package.json` and `quartz/build.ts` to correctly observe the current directory without triggering `node_modules` file descriptor limits.
2. **Path & Asset Fix**: Modified `quartz/util/path.ts` to stop stripping `.html` extensions so that static directories like `tracker/` and `psat/` with their own `index.html` copy over correctly as assets.
3. **Component Edits for Layout Migration**:
   - `quartz.config.ts`: Updated configuration, themes, colors, and typography (`Bitter` font) to match `moving` theme.
   - `quartz.layout.ts`: Stripped out left and right sidebars to implement a single-column layout.
   - `quartz/components/renderPage.tsx`: Hardcoded the wrapper (`<main class="page-content..."><div class="wrapper">`) to perfectly emulate the Jekyll HTML tree.
   - `quartz/components/RecentNotes.tsx`: Converted into a yearly chronological post list (`home` view), matching the `moving` theme.
   - `quartz/components/Footer.tsx`: Rewritten to show the hardcoded About me, Category, Gallery, and Email table.
   - `quartz/components/ArticleTitle.tsx` and `quartz/components/ContentMeta.tsx`: Updated to emulate the `← Home` link, header, and post metadata.
4. **CSS Export**: Copied SCSS rules from `moving` repo into `quartz/styles/custom.scss`.

## Current Issues & Next Steps (To-Do for Next Agent):

1. **CSS is still not applying correctly**: The styling still doesn't look exactly like the original `moving` theme. The next agent needs to deeply inspect the DOM classes outputted by Quartz versus what the `custom.scss` expects (e.g., Markdown content might be missing some wrapper classes, or Quartz's `base.scss` is overriding the moving theme's styles).
   - **Goal**: Make sure the site looks _identical_ to a standard deploy of https://github.com/huangyz0918/moving.
2. **Category and Gallery pages are broken/not appearing**:
   - The user noted that clicking on **category** or **gallery** links doesn't work correctly.
   - Jekyll handled these via root-level `.html` pages or specific layouts.
   - Quartz natively handles categories as tags or folders (`/tags/`, `/folder/`).
   - **Goal**: The next agent must recreate or correctly port the `categories` and `gallery` pages into Quartz's ecosystem so they render nicely.

## Relevant Locations:

- Original Theme Reference: `https://github.com/huangyz0918/moving` (Cloned at `/tmp/moving-theme` if you need to reference original layouts/SCSS)
- Quartz Config files: `quartz.config.ts`, `quartz.layout.ts`
- Modded Components: `/quartz/components/` (`RecentNotes.tsx`, `Footer.tsx`, `renderPage.tsx`, `ArticleTitle.tsx`, `Content.tsx`)
- Styles: `/quartz/styles/custom.scss`
