import { ComponentChildren } from "preact"
import { htmlToJsx } from "../../util/jsx"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

function isBlogPost(filePath: string | undefined) {
  const normalizedPath = filePath?.replace(/^\.\//, "")
  return normalizedPath?.startsWith("_posts/") ?? false
}

const Content: QuartzComponent = ({ fileData, tree }: QuartzComponentProps) => {
  const content = htmlToJsx(fileData.filePath!, tree) as ComponentChildren
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const classString = [
    "popover-hint",
    "post-content",
    "e-content",
    isBlogPost(fileData.filePath) ? "blog-post-content" : undefined,
    ...classes,
  ]
    .filter(Boolean)
    .join(" ")
  return <article class={classString}>{content}</article>
}

export default (() => Content) satisfies QuartzComponentConstructor
