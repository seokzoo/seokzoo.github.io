import { QuartzTransformerPlugin } from "../types"
import { Html, List, Root } from "mdast"
import { visit } from "unist-util-visit"
import { toString } from "mdast-util-to-string"
import Slugger from "github-slugger"

export interface Options {
  maxDepth: 1 | 2 | 3 | 4 | 5 | 6
  minEntries: number
  showByDefault: boolean
  collapseByDefault: boolean
  enableInlineToc: boolean
}

const defaultOptions: Options = {
  maxDepth: 3,
  minEntries: 1,
  showByDefault: true,
  collapseByDefault: false,
  enableInlineToc: true,
}

interface TocEntry {
  depth: number
  text: string
  slug: string // this is just the anchor (#some-slug), not the canonical slug
}

const slugAnchor = new Slugger()
const inlineTocMarkerRegex = /^TOC\s*\n\s*\{:\s*toc\s*\}$/i
const inlineTocStyle = `
.inline-toc {
  border-left: 3px solid var(--lightgray);
  margin: 1rem 0 1.5rem;
  padding: 0.5rem 0 0.5rem 1rem;
}

.inline-toc ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.inline-toc li {
  margin: 0.2rem 0;
}

.inline-toc a {
  color: var(--dark);
  text-decoration: none;
}

.inline-toc a:hover {
  color: var(--secondary);
  text-decoration: underline;
}

.inline-toc-depth-1 {
  padding-left: 1rem;
}

.inline-toc-depth-2 {
  padding-left: 2rem;
}

.inline-toc-depth-3 {
  padding-left: 3rem;
}

.inline-toc-depth-4 {
  padding-left: 4rem;
}

.inline-toc-depth-5 {
  padding-left: 5rem;
}
`

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function isInlineTocMarker(node: List): boolean {
  if (node.ordered || node.children.length !== 1) {
    return false
  }

  const [item] = node.children
  if (item.children.length !== 1) {
    return false
  }

  const [child] = item.children
  if (child.type !== "paragraph") {
    return false
  }

  return inlineTocMarkerRegex.test(toString(child).replaceAll("\r\n", "\n").trim())
}

function renderInlineToc(toc: TocEntry[]): string {
  if (toc.length === 0) {
    return ""
  }

  const entries = toc
    .map((entry) => {
      const slug = escapeHtml(entry.slug)
      const text = escapeHtml(entry.text)
      return `<li class="inline-toc-depth-${entry.depth}"><a href="#${slug}" data-for="${slug}">${text}</a></li>`
    })
    .join("")

  return `<nav class="inline-toc" aria-label="Table of contents"><ul>${entries}</ul></nav>`
}

export const TableOfContents: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  return {
    name: "TableOfContents",
    markdownPlugins() {
      return [
        () => {
          return async (tree: Root, file) => {
            const display = file.data.frontmatter?.enableToc ?? opts.showByDefault
            if (display) {
              slugAnchor.reset()
              const toc: TocEntry[] = []
              let highestDepth: number = opts.maxDepth
              visit(tree, "heading", (node) => {
                if (node.depth <= opts.maxDepth) {
                  const text = toString(node)
                  highestDepth = Math.min(highestDepth, node.depth)
                  toc.push({
                    depth: node.depth,
                    text,
                    slug: slugAnchor.slug(text),
                  })
                }
              })

              if (toc.length > 0 && toc.length > opts.minEntries) {
                file.data.toc = toc.map((entry) => ({
                  ...entry,
                  depth: entry.depth - highestDepth,
                }))
                file.data.collapseToc = opts.collapseByDefault
              }

              if (opts.enableInlineToc) {
                const replacements: Array<{
                  parent: { children: unknown[] }
                  index: number
                  html: Html | null
                }> = []

                visit(tree, "list", (node, index, parent) => {
                  if (typeof index !== "number" || !parent || !isInlineTocMarker(node)) {
                    return
                  }

                  const html = renderInlineToc(file.data.toc ?? [])
                  replacements.push({
                    parent,
                    index,
                    html: html ? { type: "html", value: html } : null,
                  })
                })

                for (const replacement of replacements.reverse()) {
                  if (replacement.html) {
                    replacement.parent.children.splice(replacement.index, 1, replacement.html)
                  } else {
                    replacement.parent.children.splice(replacement.index, 1)
                  }
                }
              }
            }
          }
        },
      ]
    },
    externalResources() {
      return {
        css: [
          {
            content: inlineTocStyle,
            inline: true,
          },
        ],
      }
    },
  }
}

declare module "vfile" {
  interface DataMap {
    toc: TocEntry[]
    collapseToc: boolean
  }
}
