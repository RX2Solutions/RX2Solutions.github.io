This codebase represents a GitHub Pages / Jekyll site for RX2Solutions.com

The HTML orginated in a commercial theme purchased from ThemeForest and was hand-modified on an as-needed basis into a jekyll-compatible template.

When running in non-prod environments, I've had good success with most versions of python but you will want to be careful to not always use the very latest versions of Jekyll and other gems, instead, be careful to use the currently published versions that GitHub recommends for GitHub Pages hosting.

In local environments, use:
```bundle exec jekyll build```
to test that the site builds properly,
```bundle exec jekyll serve```
to leave jekyll in watch mode for auto-rebuilds on file changes.
