import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"

interface Options {
  links: Record<string, string>
}

// @ts-ignore
export default ((opts?: Options) => {
  const Footer: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    const baseDir = pathToRoot(fileData.slug!)

    return (
      <footer class={`site-footer h-card ${displayClass ?? ""}`}>
        <data class="u-url" value={baseDir}></data>
        <div class="wrapper">
          <div class="footer-col-wrapper">
            <div class="footer-col">
              <ul class="contact-list">
                <li class="p-name">
                  <table>
                    <tbody>
                      <tr style="border-style: hidden;">
                        <td style="border-style: hidden;">
                          <a class="black-link" href={`${baseDir}/about.html`}>
                            about me
                          </a>
                        </td>
                        <td style="border-style: hidden;">
                          <a class="black-link" href={`${baseDir}/tags`}>
                            category
                          </a>
                        </td>
                        <td style="border-style: hidden;">
                          <a class="black-link" href={`${baseDir}/gallery`}>
                            gallery
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </li>
                <li>
                  <a class="u-email black-link" href="mailto:seokzoo_@kakao.com">
                    seokzoo_@kakao.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  Footer.css = `
  .site-footer {
    padding: 20px 0;
  }
  .wrapper {
    max-width: calc(800px - (30px));
    margin-right: auto;
    margin-left: auto;
    padding-right: 15px;
    padding-left: 15px;
  }
  @media screen and (min-width: 800px) {
    .wrapper {
      max-width: calc(800px - (30px * 2));
      padding-right: 30px;
      padding-left: 30px;
    }
  }
  .contact-list {
    list-style: none;
    margin-left: 0;
    padding: 0;
  }
  .black-link {
    color: #111;
    text-decoration: none;
  }
  .black-link:hover {
    color: #111;
    text-decoration: underline;
  }
  .site-footer table {
    border-collapse: collapse;
    margin-bottom: 30px;
  }
  `
  return Footer
}) satisfies QuartzComponentConstructor
