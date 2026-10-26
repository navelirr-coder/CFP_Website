# Product Catalogues Repository

Crunchies and Bites are available and open in a new tab from `catalogues.html`.
Turmeric remains Coming Soon until its PDF is supplied. Replace existing PDFs
using the same filenames to update the downloads.

Catalogue files:

1. **`crunchies-catalogue.pdf`**
   - Catalogue: CFP Crunchies Range Catalogue
   - Card location: Card 1 on `catalogues.html`

2. **`bites-catalogue.pdf`**
   - Catalogue: CFP Bites Range Catalogue
   - Card location: Card 2 on `catalogues.html`

3. **`turmeric-catalogue.pdf`**
   - Catalogue: CFP Turmeric Range Catalogue
   - Card location: Card 3 on `catalogues.html`

### How to Activate Catalogues:
Once a PDF file is placed in this folder, open `script.js` and in the `CFP_DOC_REGISTRY` object, set the corresponding catalogue `available: true`:

```javascript
crunchies: {
  path: 'assets/catalogues/crunchies-catalogue.pdf',
  available: true,
  title: 'Crunchies Catalogue'
}
```
The catalogue card button will automatically activate, the badge will switch from "Coming Soon" to "Available", and clicking "VIEW CATALOGUE ↗" will open the PDF in a new browser tab.
