import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [
    Component.ConditionalRender({
      condition: (p) => p.fileData.slug === "index",
      component: Component.RecentNotes({ title: "", limit: 1000, showTags: false }),
    }),
  ],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/seokzoo",
      Category: "/tags",
      Gallery: "/gallery",
      Email: "mailto:seokzoo_@kakao.com",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [Component.ArticleTitle(), Component.ContentMeta(), Component.TagList()],
  left: [],
  right: [],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.ArticleTitle(), Component.ContentMeta()],
  left: [],
  right: [],
}
