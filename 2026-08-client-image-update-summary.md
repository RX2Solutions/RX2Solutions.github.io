# August 2026 Client Image Update

The nine new client-supplied images have been prepared for the web and implemented on the local staging site.

## Image preparation

- Preserved each source image in `_inbox/2026-08-images/` without modification.
- Created new, descriptively named JPEG assets in `assets/images/`.
- Converted the images to sRGB, capped them at 1920 pixels wide, and saved them as optimized progressive JPEGs.
- Reduced the individual image sizes from approximately 1.5–9.9 MB to approximately 188–528 KB while retaining high-resolution display quality.

## Solution images

| Client file | Implemented as | Where it appears |
| --- | --- | --- |
| `HROutsourcing.jpeg` | `2026-08-human-resource-outsourcing.jpg` | Home-page Human Resource Outsourcing card; Human Resource Outsourcing page hero and closing banner |
| `Executive Search.jpeg` | `2026-08-executive-search.jpg` | Home-page Executive Search card; Executive Search page hero and closing banner |
| `StrategicStaffing.jpeg` | `2026-08-strategic-staffing.jpg` | Home-page Strategic Staffing card; Strategic Staffing page closing banner |

Solution page paths:

- `/human-resource-outsourcing.html`
- `/executive-search.html`
- `/strategic-staffing.html`

## Case-study images

Each case-study image now appears on the home-page case-study card, the Case Studies overview, the complete case-study page, and the related opt-in page.

| Client file | Case study | Implemented as |
| --- | --- | --- |
| `nationwide company.jpeg` | One Company Nationwide | `2026-08-one-company-nationwide.jpg` |
| `precision talent.jpeg` | Precision Talent Delivery | `2026-08-precision-talent-delivery.jpg` |
| `exeleadership.jpeg` | Executive Leadership Alignment | `2026-08-executive-leadership-alignment.jpg` |
| `one company.jpeg` | One Company Scaling | `2026-08-one-company-scaling.jpg` |
| `Strategic Dis.jpeg` | Strategic Needs Discovery | `2026-08-strategic-needs-discovery.jpg` |
| `Integratedone.jpeg` | Complete HR Integration | `2026-08-complete-hr-integration.jpg` |

Case-study paths:

- `/case-studies/`
- `/case-studies/one-company-nationwide/`
- `/case-studies/precision-talent-delivery/`
- `/case-studies/executive-leadership-alignment/`
- `/case-studies/one-company-scaling/`
- `/case-studies/strategic-needs-discovery/`
- `/case-studies/complete-hr-integration/`
- The corresponding `/landing/...-case-study/` opt-in pages

## Verification and status

- Confirmed all nine images load successfully on the local staging site.
- Visually reviewed the solution cards, service-page treatments, case-study overview, case-detail heroes, and opt-in page imagery.
- Confirmed the pages produced no browser console warnings or errors during review.
- No staging or production push was performed; the changes are ready for review before publishing.
