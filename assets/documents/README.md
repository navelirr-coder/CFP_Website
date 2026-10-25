# Legal & Registration Documents Repository

Official business PDFs linked from the registration cards on `about.html`:

1. **`gst-registration.pdf`**
   - Document: GST Registration Certificate
   - Card location: Section 7 (Our Registrations & Licences) on `about.html`

2. **`fssai-licence.pdf`**
   - Document: Food Safety and Standards Authority of India (FSSAI) Licence
   - Card location: Section 7 (Our Registrations & Licences) on `about.html`

3. **`iec-certificate.pdf`**
   - Document: Importer Exporter Code Certificate
   - Card location: Section 7 (Our Registrations & Licences) on `about.html`

4. **`msme-registration.pdf`**
   - Document: MSME Registration
   - Card location: Section 7 (Our Registrations & Licences) on `about.html`

### Updating Documents
All four documents are available. Each card opens its matching PDF in a new tab.
Replace a PDF using the same filename to update its document without changing the link.
When adding a new document, add its card to `about.html` and an entry in the
`CFP_DOC_REGISTRY` object in `script.js` with `available: true`:

```javascript
gst: {
  path: 'assets/documents/gst-registration.pdf',
  available: true,
  title: 'GST Registration'
}
```
The document card will automatically become active, the badge will switch from "Coming Soon" to "Available", and clicking the card will open the PDF in a new browser tab.
