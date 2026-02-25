import { Date, getDate } from "./Date"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

export default (() => {
  function ContentMetadata({ cfg, fileData, displayClass }: QuartzComponentProps) {
    if (fileData.slug === "index" || fileData.slug === "about" || fileData.slug === "gallery") {
      return null
    }

    if (fileData.text && fileData.dates) {
      return (
        <p class={classNames(displayClass, "content-meta", "post-meta")}>
          <Date date={getDate(cfg, fileData)!} locale={cfg.locale} />
        </p>
      )
    } else {
      return null
    }
  }

  ContentMetadata.css = `
  .post-meta {
    color: #515151;
    font-size: 18px;
    margin-top: 0;
  }
  @media (max-width: 500px) {
    .post-meta {
      font-size: 14.4px;
    }
  }
  `

  return ContentMetadata
}) satisfies QuartzComponentConstructor
