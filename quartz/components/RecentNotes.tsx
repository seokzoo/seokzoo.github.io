import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { SimpleSlug, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { byDateAndAlphabetical } from "./PageList"
import { getDate } from "./Date"
import { GlobalConfiguration } from "../cfg"
import { i18n } from "../i18n"
import { classNames } from "../util/lang"

interface Options {
  title?: string
  limit: number
  linkToMore: SimpleSlug | false
  showTags: boolean
  filter: (f: QuartzPluginData) => boolean
  sort: (f1: QuartzPluginData, f2: QuartzPluginData) => number
}

const defaultOptions = (cfg: GlobalConfiguration): Options => ({
  limit: 1000,
  linkToMore: false,
  showTags: false,
  filter: (f) =>
    f.slug !== "index" &&
    f.slug !== "about" &&
    f.slug !== "gallery" &&
    !f.slug?.startsWith("categories"),
  sort: byDateAndAlphabetical(cfg),
})

export default ((userOpts?: Partial<Options>) => {
  const RecentNotes: QuartzComponent = ({
    allFiles,
    fileData,
    displayClass,
    cfg,
  }: QuartzComponentProps) => {
    const opts = { ...defaultOptions(cfg), ...userOpts }
    const pages = allFiles.filter(opts.filter).sort(opts.sort)

    // Group by year
    const grouped: Record<string, typeof pages> = {}
    for (const page of pages.slice(0, opts.limit)) {
      const pageDate = getDate(cfg, page)
      const year = pageDate ? pageDate.getFullYear().toString() : "No Date"
      if (!grouped[year]) {
        grouped[year] = []
      }
      grouped[year].push(page)
    }

    // Sort years descending
    const sortedYears = Object.keys(grouped).sort((a, b) => {
      if (a === "No Date") return 1
      if (b === "No Date") return -1
      return parseInt(b) - parseInt(a)
    })

    return (
      <div class={classNames(displayClass, "home")}>
        <div class="home-title">
          <p class="home-heading">{cfg.pageTitle}</p>
          <p class="home-sub-heading">항상 건강하고 행복하세요</p>
        </div>
        <ul class="post-list">
          {sortedYears.map((year) => (
            <>
              <h2 id={`${year}-ref`} class="post-year">
                {year}
              </h2>
              <ul>
                {grouped[year].map((page) => {
                  const title = page.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title
                  const pageDate = getDate(cfg, page)

                  // Format to "MMM dd" e.g. "Nov 10" or "Jun 16"
                  const formattedDate = pageDate
                    ? pageDate.toLocaleDateString("en-US", { month: "short", day: "2-digit" })
                    : ""

                  return (
                    <li>
                      <span class="post-meta">{formattedDate}</span>
                      <a
                        class="black-link post-link-layout"
                        href={resolveRelative(fileData.slug!, page.slug!)}
                      >
                        {title}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </>
          ))}
        </ul>
      </div>
    )
  }

  RecentNotes.css = `
  ul.post-list {
    margin-left: 0;
    list-style: none;
    padding-left: 0;
  }
  ul.post-list li {
    display: flex;
    margin-bottom: 2.5px;
    align-items: center;
    line-height: 1.6;
  }
  .post-year {
    margin-top: 2rem;
    margin-bottom: 0.25rem;
    font-weight: 700;
    color: #373737;
    font-size: 27px;
    font-family: inherit;
    line-height: 1.6;
  }
  .post-meta {
    display: inline-block;
    min-width: 80px;
    font-size: 21.6px;
    color: #515151;
  }
  .post-link-layout {
    margin-left: 5%;
    display: inline;
    font-size: 21.6px;
  }
  .black-link {
    color: #111;
    text-decoration: none;
  }
  .black-link:hover {
    color: #111;
    text-decoration: underline;
  }
  .home-title {
    margin-top: -10px;
  }
  .home-heading {
    font-weight: 400;
    color: #373737;
    font-size: 39.6px;
    margin: 0;
    line-height: 1.6;
  }
  .home-sub-heading {
    margin-top: -0.6rem;
    color: #515151;
    font-size: 18px;
    margin-bottom: 0;
    line-height: 1.6;
  }
  @media (max-width: 500px) {
    .home-heading {
      margin-top: 20px;
      font-size: 30.6px;
    }
    .home-sub-heading {
      font-size: 14.4px;
    }
    .post-year {
      font-size: 21.6px;
    }
    .post-meta {
      font-size: 14.4px;
      min-width: 60px;
    }
    .post-link-layout {
      font-size: 18px;
    }
  }
  `
  return RecentNotes
}) satisfies QuartzComponentConstructor
