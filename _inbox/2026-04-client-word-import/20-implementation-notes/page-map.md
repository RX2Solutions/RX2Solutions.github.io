# Page Map

This file translates the converted client document into concrete site work for the RX2 Jekyll site. It is a planning artifact, not final implementation spec.

## Source Files

- Original Word docs: `_inbox/2026-04-client-word-import/00-source/`
- Converted source: `_inbox/2026-04-client-word-import/10-converted/full-export.md`
- This planning file: `_inbox/2026-04-client-word-import/20-implementation-notes/page-map.md`

## Scope Summary

- Refresh the home page with new positioning copy and replace the testimonial section with case-study-driven content.
- Add a new case studies overview page with quick-jump overview cards at the top and medium-detail case sections below.
- Add six individual case study detail pages driven by a new Jekyll collection and a dedicated case study layout.
- Refresh the existing "Our Solutions" pages in the main nav using the new copy from `full-export.md`.

## Existing Pages To Update

### Home page

- Primary page: `index.md`
- Likely affected includes:
  - `_includes/mainslider.html`
  - `_includes/process.html`
  - `_includes/services.html`
  - `_includes/testimonials.html`

Planned updates:

- Update hero copy to the new positioning:
  - "People First. Respectfully Professional, Always."
  - "HR Outsourcing. Executive Search. Strategic Staffing - Delivered Nationwide."
- Refresh the "Our Solutions" section with the new three-service copy in `full-export.md`.
- Add or adapt a section for:
  - "One Partner. One Contact. Fully Integrated."
  - "What Respectfully Professional Means"
- Replace the current testimonials section with a homepage case-study carousel or grid using the six short case cards from `full-export.md`.
- Each homepage case card should link to the new case studies overview page, not directly to detail pages.
- Add the new home CTA:
  - "Ready to talk about your people challenges?"
  - "Start a Respectfully Professional Conversation"

Implementation note:

- The current home page is assembled from includes rather than a single content file, so this is partly a content update and partly a component refactor.

### Our Solutions pages

These are existing nav pages, not `_landing_pages/`. Treat them as core site pages under "Our Solutions."

#### Human Resource Outsourcing

- Existing file: `human-resource-outsourcing.md`
- Source in `full-export.md`: `HRO Landing Page`
- Planned change: replace page copy with the new HRO positioning and service summary.
- Assumption: keep the current layout unless the new copy breaks the existing `leftright` structure.

#### Executive Search

- Existing file: `executive-search.md`
- Source in `full-export.md`: `Executive Search Landing Page`
- Planned change: replace headline, intro, and section copy with the new executive-search positioning.
- Assumption: likely content refresh within current `solutions` layout.

#### Strategic Staffing

- Existing file: `strategic-staffing.md`
- Source in `full-export.md`: `Strategic Staffing Landing Page`
- Planned change: refresh parent-page copy and keep this page as the hub for the division-specific pages.
- Assumption: preserve current "services-page" role unless design requirements change.

#### Information Technology

- Existing file: `information-technology.md`
- Source in `full-export.md`: `Information Technology`
- Planned change: replace current body copy with the new IT practice copy.

#### Scientific & Clinical

- Existing file: `scientific-clinical.md`
- Source in `full-export.md`: `Scientific & Clinical`
- Planned change: replace current body copy with the new scientific and clinical practice copy.

#### Professional Services

- Existing file: `professional-services.md`
- Source in `full-export.md`: `Professional Services`
- Planned change: replace current body copy with the new professional services practice copy.

#### Engineering & Supply Chain

- Existing file: `engineering-supply-chain.md`
- Source in `full-export.md`: `Engineering & Supply Chain`
- Planned change: replace current body copy with the new engineering and supply chain practice copy.

## New Pages To Add

### Case Studies overview page

- Proposed output path: `/case-studies/`
- Proposed source file: `case-studies.md`
- Proposed layout: `_layouts/case-studies.html`
- Design direction: adapt the Trax testimonial-style page as a source reference, but reshape it around RX2 case studies instead of quotes.

Planned page structure:

- Hero / page intro for case studies
- Top section with six "expanded summary" overview cards
- Quick navigation from those cards to anchor sections lower on the same page
- Lower page sections with medium-detail summaries for each case study
- CTA button from each medium-detail section to the full individual case study page
- "What These Cases Demonstrate" section
- Optional filter tabs if the UI supports them cleanly
- Footer CTA

Primary content source:

- `Case Studies`
- `Case Study Overview Cards (Expanded Summaries)`
- `Section: What These Cases Demonstrate`
- `Footer CTA`

### Case study detail template and collection

- Proposed new collection: `_case_studies/`
- Proposed `_config.yml` addition:
  - output collection with permalink like `/case-studies/:title/` or `/case-studies/:name/`
- Proposed layout: `_layouts/case-study.html`
- Design direction: adapt the Trax services-detail page into an RX2 case-study detail template.

Suggested page model for each case:

- Hero title
- Subtitle
- Snapshot
- Key metrics
- Situation
- What We Did
- Outcome
- Strategic Impact
- CTA

Suggested collection fields:

- `title`
- `subtitle`
- `service_line`
- `metrics`
- `summary`
- `cta_label`
- `cta_url`
- `order`
- `tags`

## Proposed Case Study Pages

### 1. One Company Nationwide

- Proposed file: `_case_studies/one-company-nationwide.md`
- Proposed URL: `/case-studies/one-company-nationwide/`
- Home card source: `1. One Company Nationwide`
- Overview source: `1. One Company Nationwide`
- Detail source: `ONE COMPANY NATIONWIDE`
- Focus: strategic staffing, nationwide support, operational continuity

### 2. Complete HR Integration

- Proposed file: `_case_studies/complete-hr-integration.md`
- Proposed URL: `/case-studies/complete-hr-integration/`
- Home card source: `6. Complete HR Integration`
- Overview source: `2. Complete HR Integration`
- Detail source: `COMPLETE HR INTEGRATION`
- Focus: HRO, full HR function, biotech growth support

### 3. Executive Leadership Alignment

- Proposed file: `_case_studies/executive-leadership-alignment.md`
- Proposed URL: `/case-studies/executive-leadership-alignment/`
- Home card source: `3. Executive Leadership Alignment`
- Overview source: `3. Executive Leadership Alignment`
- Detail source: `EXECUTIVE LEADERSHIP ALIGNMENT`
- Focus: executive search, IT leadership, modernization

### 4. One Company Scaling

- Proposed file: `_case_studies/one-company-scaling.md`
- Proposed URL: `/case-studies/one-company-scaling/`
- Home card source: `4. One Company Scaling`
- Overview source: `4. One Company Scaling`
- Detail source: second `ONE COMPANY SCALING` section in `full-export.md`
- Focus: strategic staffing, multi-function support, enterprise expansion
- Canonical choice: use the second long-form version, starting with `Expanding from a Single Department to a Fully Integrated Enterprise Partnership`

### 5. Strategic Needs Discovery

- Proposed file: `_case_studies/strategic-needs-discovery.md`
- Proposed URL: `/case-studies/strategic-needs-discovery/`
- Home card source: `5. Strategic Needs Discovery`
- Overview source: `5. Strategic Needs Discovery`
- Detail source: `STRATEGIC NEEDS DISCOVERY`
- Focus: executive search, discovery-led problem diagnosis, leadership alignment

### 6. Precision Talent Delivery

- Proposed file: `_case_studies/precision-talent-delivery.md`
- Proposed URL: `/case-studies/precision-talent-delivery/`
- Home card source: `2. Precision Talent Delivery`
- Overview source: `6. Precision Talent Delivery`
- Detail source: `PRECISION TALENT DELIVERY`
- Focus: specialized placement, precision search, hard-to-fill talent

## Shared Component And Template Work

- Replace or heavily refactor `_includes/testimonials.html` into a home-page case study component.
- Create a reusable include for case-study cards if the same card format appears on both the home page and the overview page.
- Add a new case-study overview layout or include set instead of hard-coding long HTML in a single page.
- Add a dedicated case-study detail layout for collection-driven pages.
- Decide whether case study metadata should live only in `_case_studies/` or also in `_data/` for home-page summaries.

## Content Extraction Notes

Use the converted document in three layers:

- Home page:
  - Hero
  - What We Do
  - What you can expect
  - What Respectfully Professional Means
  - Homepage Case Cards
  - Homepage CTA
- Solution pages:
  - HRO Landing Page
  - Executive Search Landing Page
  - Strategic Staffing Landing Page
  - Division Specific Pages within Strategic Staffing
- Case study funnel:
  - Homepage Case Cards (short)
  - Case Study Overview Cards (medium)
  - Individual Case Landing Pages (long)

## Working Assumptions

- The new case study funnel is:
  - home page short card
  - case studies overview page with medium-detail sections
  - individual case study detail page
- The overview page does not need to be in the main nav unless the client later asks for it.
- The existing solution-page layouts can probably be reused for the copy refresh.
- The case study work is new template and IA work, not just content replacement.

## Open Questions

- Should the case studies overview page live at `/case-studies/` or as a top-level `.html` page?
- Should the top overview cards scroll to anchor sections on the same page, link to detail pages directly, or do both?
- Do we want filter tabs in v1, or treat them as an optional enhancement?
- Should the current testimonial content be removed entirely from the home page, or reused elsewhere on the site?
- Do the case study pages need specific images, icons, or industry labels beyond the current copy?
- Does the case studies overview page need a nav link, or should it only be discoverable from the home page?
