import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

import { pathToRoot } from "../util/path"

const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const title = fileData.frontmatter?.title
  const baseDir = pathToRoot(fileData.slug!)

  if (title && fileData.slug !== "index") {
    if (fileData.slug?.startsWith("tags/")) {
      return (
        <div class={displayClass}>
          <div class="post-back">
            <a class="black-link" href={baseDir}>
              ← Home
            </a>
          </div>
          <div>
            <h1>{title}</h1>
          </div>
        </div>
      )
    }

    if (fileData.slug === "about") {
      return (
        <div class={classNames(displayClass, "post-header")}>
          <div class="post-back">
            <a class="black-link" href={baseDir}>
              ← Home
            </a>
          </div>
        </div>
      )
    }


    return (
      <header class={classNames(displayClass, "post-header")}>
        <div class="post-back">
          <a class="black-link" href={baseDir}>
            ← Home
          </a>
        </div>
        <h1 class="article-title">{title}</h1>
      </header>
    )
  } else {
    return null
  }
}

ArticleTitle.css = `
.post-back {
  margin-bottom: 20px;
  color: #515151;
  font-size: 18px;
}
.article-title {
  font-size: 39.6px;
  line-height: 1.3;
  font-weight: 400;
  margin-top: -0.5rem;
}
.black-link {
  color: #111;
  text-decoration: none;
}
.black-link:hover {
  text-decoration: underline;
}
`

export default (() => ArticleTitle) satisfies QuartzComponentConstructor
