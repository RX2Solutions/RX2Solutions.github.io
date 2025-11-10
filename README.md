# rx2solutions-com
RX2 Solutions website — GitHub Pages + Jekyll.
- Actively uses Jekyll blog features (`_posts/`).
- Theme: Trax (ThemeForest), hand‑converted from HTML to Jekyll layouts/includes as needed.
- Local build: `bundle exec jekyll build`.
- Note: GitHub Pages pins gem versions; use the `github-pages` gem for local parity.

## Landing Page Colorways

Landing pages (`_landing_pages/*` rendered with `_layouts/landing.html`) now support six curated colorways. Set `colorway` in the page front matter to swap palettes; omit it to use the default `cream`.

Available options:
1. `cream` – current beige/amber palette.
2. `sage` – soft green base with gold CTAs.
3. `dusk` – muted indigo with warm accent buttons.
4. `slate` – cool gray-blue with bold cobalt accents.
5. `ember` – warm terracotta with saffron CTAs.
6. `ocean` – airy teal with sunshine button highlights.

Example:

```yaml
---
title: Example Landing Page
colorway: sage
---
```

## Manual Blog Pagination (Important)

This site intentionally avoids non-whitelisted plugins so it builds on GitHub Pages without Actions. As a result, blog pagination is implemented manually in `_includes/blog.html` and by maintaining numbered index pages for each tag we display:

- Articles (posts tagged `publication`): `articles.html`, `articles2.html`, `articles3.html`, ...
- Announcements (posts tagged `announcement`): `announcements.html`, `announcements2.html`, `announcements3.html`, ...

Each numbered page is a tiny file with front matter only, setting `this_page` to the appropriate page number. Example for page 3:

```
---
layout: default
title: Blog
desired-tag: publication
this_page: 3
---
{% include blog.html %}
```

The `_includes/blog.html` file controls how many posts appear per page. Currently:

- Posts per page: 9
- Filter by tag using `page.desired-tag`

When to add more pages
- If the number of posts for a given tag grows so that page N fills up, add the next page by copying the previous file and incrementing `this_page`. For example, if `articles5.html` fills up, add `articles6.html` with `this_page: 6`. Do the same for announcements if needed.

Notes
- GitHub Pages does not support `jekyll-paginate-v2`. Keeping this manual approach ensures that commits of new files to `_posts/` by editors are all that’s required—no local builds or Actions are needed.
- The navigation currently links to Articles via `/articles.html`. Announcements are available at `/announcements.html` but may not be linked in the main nav.
