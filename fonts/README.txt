# Self-hosted web fonts

Archivo and JetBrains Mono as variable fonts (one file each; Archivo covers weights 100 to 900,
JetBrains Mono 100 to 800), latin subset, WOFF2, downloaded from the Google Fonts CSS API on 2026-10-12.

Both families are licensed under the SIL Open Font License 1.1
(https://openfontlicense.org). Archivo: Omnibus-Type. JetBrains Mono: JetBrains.
The fonts are served from this directory so pages no longer depend on a
render-blocking stylesheet from fonts.googleapis.com. The @font-face rules
live inline in each page head (see scripts/sweep notes in the 2026-10-12 commit).
