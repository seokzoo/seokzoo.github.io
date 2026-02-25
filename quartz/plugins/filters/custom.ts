import { QuartzFilterPlugin } from "../types"

export const FilterNonBlogPosts: QuartzFilterPlugin = () => ({
    name: "FilterNonBlogPosts",
    shouldPublish(_ctx, [_tree, vfile]) {
        const filePath = vfile.data.filePath as string | undefined
        if (!filePath) return true

        const normalizedPath = filePath.startsWith("./") ? filePath.slice(2) : filePath
        const parts = normalizedPath.split("/")
        const filename = parts[parts.length - 1]

        // 1. Never generate markdown files that start with "-"
        if (filename.startsWith("-")) {
            return false
        }

        // 2. Generate markdown files under _posts
        if (parts.length > 1 && parts[0] === "_posts") {
            return true
        }

        // 3. Keep essential root files so the homepage and main pages do not break
        if (parts.length === 1 && ["index.md", "about.md", "gallery.md"].includes(filename)) {
            return true
        }

        // 4. Do not generate any other markdown files as blog posts, as requested
        return false
    }
})
