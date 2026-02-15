# harryzhong.com

Source code for my personal website: [harryzhong.com](https://harryzhong.com/).

This site is built with [Quarto](https://quarto.org/). It serves as a personal portfolio, resume, and a "lab" for showcasing data science projects.

## Technology Stack

- **Framework:** [Quarto](https://quarto.org/)
- **Languages:** Python, R, and Markdown
- **Styling:** Custom SCSS (`custom.scss`) layered over [Bootstrap](https://getbootstrap.com/) themes (Darkly/Flatly)
- **Environment Management:** `uv` for Python virtual environments and `renv` for R package reproducibility
- **Deployment:** [Cloudflare Pages](https://pages.cloudflare.com/) via GitHub Actions

## Repository Structure

The project follows a modular Quarto website structure:

- **`_quarto.yml`**: The "brain" of the site. This configuration file defines the website's title, navigation bar structure, social media links, and global rendering options like themes and table of contents.
- **`index.qmd`**: The landing page of the website. It uses Quarto's `about` page feature to create a centralized profile.
- **`the_lab.qmd`**: A listing page that aggregates projects. It uses Quarto's `listing` feature to automatically generate a grid of project cards based on the content in the `the_lab/` directory and external links.
- **`the_lab/`**: A collection of subdirectories, each representing a separate project or analysis. These are rendered into the "The Lab" section.
- **`custom.scss`**: Contains custom SASS/SCSS variables and CSS overrides to customize the site's aesthetics beyond the default Bootstrap themes.
- **`_extensions/`**: Custom Quarto extensions that add functionality, such as the FontAwesome support used for icons throughout the site.
- **`_site/`**: (Generated) The final static website output. This is what Cloudflare Pages serves to users.
- **`renv.lock`**: A lockfile produced by the `renv` package to ensure the R environment is reproducible across different machines.

## Local Development

To work on this website locally, ensure you have [Quarto CLI](https://quarto.org/docs/get-started/) installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Harry2687/website.git
    cd website
    ```

2.  **Preview the site:**
    Run the following command to start a local development server with live reload:
    ```bash
    quarto preview
    ```

3.  **Render the site:**
    To manually generate the static files in the `_site/` directory:
    ```bash
    quarto render
    ```

## Deployment

The website utilizes a CI/CD pipeline for automated updates:
1.  **GitHub Action:** The `publish.yml` workflow triggers on every push to the `main` branch.
2.  **Render:** Quarto renders the site inside the GitHub Actions runner environment.
3.  **Cloudflare Pages:** The rendered `_site/` directory is pushed to the `cf-pages` branch, which Cloudflare Pages handles for high-performance hosting.