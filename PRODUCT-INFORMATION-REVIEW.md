# Product information source review

Content is maintained in `product-information-data.js`, keyed by existing shop slugs.
Cart IDs, image paths, category IDs and existing card order are preserved. In particular,
Jowar Chips remains c3 and Jowar Chivda remains c4; the source request lists these in
a different order but explicitly requires preserving the existing order.

The shop alone loads the independent controller and scoped stylesheet. Its single
panel sits after the entire grid. Hover/focus previews until a card is selected;
click, Enter or Space pins the selection. Existing title links still navigate and
Add to Cart buttons still purchase without selecting or preventing their events.
A pinned product remains pinned across category changes until another card is selected.
Turmeric cards and their enquiry links are unchanged.

## Verify before publishing nutrition claims

All values below are preserved exactly as supplied. No serving figures have been
recalculated, rounded, or inferred. The data file also contains review notes.

- Ragi Ladoo: table says 20 g; catalogue footnote says 30 g. The panel uses the
  table's 20 g heading and supplied serving values.
- Millet Ladoo: table says 20 g; footnote says 30 g. Serving carbohydrate is
  supplied as 60.63 g, the same as the per-100 g value. Serving energy is
  93.98 kcal. These figures need verification; they are not silently corrected.
- Millet Cookies: source specifies a 12 g serving but several serving figures
  appear inconsistent. Total fat is 0.10 g per serving as supplied. The panel
  retains the 12 g heading and all supplied figures for review.
- Nutri Millet Bar: name is provisional. The source information table says
  Ragi Sticks while the image and ingredients describe a bar. Change `name` in
  the data file once confirmed. The existing card title and cart metadata are
  intentionally preserved.

Short card descriptions use only the supplied ingredients. Full descriptions,
ingredients, approved highlights and all 82 nutrient rows are in the shared data
file. Unavailable nutrients are omitted rather than represented as zero.
