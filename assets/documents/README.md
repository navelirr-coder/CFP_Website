# Legal & Registration Documents Repository

Place official business PDF documents here:

1. **`gst-registration.pdf`**
   - Document: GST Registration Certificate
   - Card location: Section 7 (Our Registrations & Licences) on `about.html`

2. **`fssai-licence.pdf`**
   - Document: Food Safety and Standards Authority of India (FSSAI) Licence
   - Card location: Section 7 (Our Registrations & Licences) on `about.html`

3. **`apeda-registration.pdf`**
   - Document: APEDA Registration Document
   - Card location: Section 7 (Our Registrations & Licences) on `about.html`

### How to Activate Documents:
Once a PDF file is placed in this folder, open `script.js` and in the `CFP_DOC_REGISTRY` object, set the corresponding document `available: true`:

```javascript
gst: {
  path: 'assets/documents/gst-registration.pdf',
  available: true,
  title: 'GST Registration'
}
```
The document card will automatically become active, the badge will switch from "Coming Soon" to "Available", and clicking the card will open the PDF in a new browser tab.
