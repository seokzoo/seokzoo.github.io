import { spawn } from "node:child_process"
import { Root, Code, Html, BlockContent } from "mdast"
import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"
import { CSSResource } from "../../util/resources"
import d2Style from "../../components/styles/d2.inline.scss"

interface Options {
  command: string
  layout: "dagre" | "elk"
  theme?: number
  darkTheme?: number
  pad: number
  sketch: boolean
  center: boolean
  scale?: number
  target?: string
  timeout: number
  className: string
}

const defaultOptions: Options = {
  command: "d2",
  layout: "dagre",
  pad: 32,
  sketch: false,
  center: false,
  timeout: 120,
  className: "d2-diagram",
}

type ParentWithBlockChildren = {
  children: BlockContent[]
}

function isD2CodeBlock(node: Code) {
  return node.lang?.trim().toLowerCase() === "d2"
}

function renderFigure(svg: string, className: string): Html {
  return {
    type: "html",
    value: `<figure class="${className}">${svg}</figure>`,
  }
}

function buildArgs(opts: Options, salt: string) {
  const args = [
    "--stdout-format",
    "svg",
    "--no-xml-tag",
    "--omit-version",
    "--layout",
    opts.layout,
    "--pad",
    String(opts.pad),
    "--timeout",
    String(opts.timeout),
    "--salt",
    salt,
  ]

  if (opts.theme !== undefined) {
    args.push("--theme", String(opts.theme))
  }
  if (opts.darkTheme !== undefined) {
    args.push("--dark-theme", String(opts.darkTheme))
  }
  if (opts.sketch) {
    args.push("--sketch")
  }
  if (opts.center) {
    args.push("--center")
  }
  if (opts.scale !== undefined) {
    args.push("--scale", String(opts.scale))
  }
  if (opts.target !== undefined) {
    args.push("--target", opts.target)
  }

  args.push("-", "-")
  return args
}

function renderD2(source: string, opts: Options, salt: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(opts.command, buildArgs(opts, salt), {
      stdio: ["pipe", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    child.stdout.setEncoding("utf8")
    child.stdout.on("data", (chunk) => {
      stdout += chunk
    })
    child.stderr.setEncoding("utf8")
    child.stderr.on("data", (chunk) => {
      stderr += chunk
    })
    child.on("error", (error) => {
      reject(error)
    })
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(stderr.trim() || `d2 exited with code ${code}`))
      }
    })

    child.stdin.end(source)
  })
}

export const D2Diagrams: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts: Options = { ...defaultOptions, ...userOpts }

  return {
    name: "D2Diagrams",
    markdownPlugins() {
      return [
        () => async (tree: Root, file) => {
          const blocks: Array<{
            node: Code
            index: number
            parent: ParentWithBlockChildren
          }> = []

          visit(tree, "code", (node: Code, index, parent) => {
            if (isD2CodeBlock(node) && typeof index === "number" && parent) {
              blocks.push({
                node,
                index,
                parent: parent as ParentWithBlockChildren,
              })
            }
          })

          for (const { node, index, parent } of blocks) {
            try {
              const salt = `${file.data.slug ?? "d2"}-${index}`
              const svg = await renderD2(node.value, opts, salt)
              parent.children[index] = renderFigure(svg, opts.className)
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error)
              throw new Error(
                `D2 diagram rendering failed in ${file.data.relativePath}: ${message}`,
              )
            }
          }
        },
      ]
    },
    externalResources() {
      const css: CSSResource[] = [
        {
          content: d2Style,
          inline: true,
        },
      ]

      return { css }
    },
  }
}
