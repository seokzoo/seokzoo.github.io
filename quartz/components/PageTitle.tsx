import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <div class={classNames(displayClass, "page-title-container")}>
      <img src={`${baseDir}/selfie.jpeg`} alt="Avatar" class="avatar-img" />
      <h2 class="page-title">
        <a href={baseDir}>{title}</a>
      </h2>
      <p class="page-description">Hi, I'm seokju!</p>
    </div>
  )
}

PageTitle.css = `
.page-title {
  font-size: 1.75rem;
  margin: 0;
  font-family: var(--titleFont);
}
.page-title-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 2rem;
}
.avatar-img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  margin-bottom: 1rem;
  object-fit: cover;
}
.page-description {
  margin-top: 0.5rem;
  font-size: 1rem;
  color: var(--gray);
}
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
