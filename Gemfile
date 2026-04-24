source 'https://rubygems.org'

# Pin to the github-pages gem to mirror the Pages-served Jekyll stack
# exactly. Ensures local/CI build parity with what GitHub Pages'
# auto-build uses today. After adopting the custom GitHub Actions
# workflow, this gem remains pinned so that build output stays
# byte-compatible with pre-migration state (no plugin drift).
#
# If we later want to unlock non-whitelisted plugins (jekyll-minifier,
# jekyll-purgecss, etc.), switch to a direct Jekyll gem + selective
# plugins instead of github-pages. For now the post-processing pipeline
# handles minification / PurgeCSS / critical CSS extraction OUTSIDE of
# Jekyll (post-jekyll-build), so the github-pages pin is appropriate.
gem 'github-pages', group: :jekyll_plugins

# Webrick is not in the Ruby 3+ stdlib; jekyll serve needs it explicitly.
gem 'webrick'
