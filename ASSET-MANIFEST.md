# Apex website assets

## Brand and real project photography
- Original gold Apex logo, wordmark, favicon and Apple touch icon are retained.
- `public/assets/apex-wine-room.jpeg` is The owner's supplied photograph, copied without visual alteration from `IMG_5414.jpeg`. It is the site's completed-project image. No client name, address, value, or completion date is inferred.

## Architectural concepts
- `public/assets/home-editorial.webp`: newly generated exterior concept of a renovated Alabama brick house with dark metal roofing and a timber entry, photographed in believable evening light.
- `public/assets/kitchen-editorial.webp`: newly generated interior concept with walnut cabinetry, stone counters and natural daylight.

These two images were created with the built-in image-generation tool for this redesign. They are labelled as AI design concepts wherever presented as project imagery. Neither is represented as completed Apex work. Generated PNGs were converted to WebP with Sharp for delivery. The previous set of synthetic portfolio-style images was removed from the public build.

## Interactive architectural studies
The home, duplex and fourplex are procedural Three.js geometry, not raster images. Finished, structure and floor-plan views share the same underlying model. A Canvas renderer provides an interactive fallback when WebGL is unavailable. They are illustrative models, not construction plans or proposed permit drawings.

## Typography and icons
Locally hosted Nimbus Sans Narrow Bold provides the condensed display typography; Nimbus Sans supplies body and interface text. Their existing license is included at `public/assets/fonts/LICENSE.txt`. No external font request is required. Arrows and other interface icons use a consistent SVG line system, with no emoji icons.

## Additional renovation imagery
- `public/assets/duplex-editorial.webp`: attainable duplex renovation concept with distinct front entries; used for multifamily work and the inquiry page.
- `public/assets/deck-editorial.webp`: timber deck and pergola concept; used for exterior scope and the about page.
- `public/assets/bath-editorial.webp`: walnut vanity and glass-shower bathroom concept; used in the homepage image range and kitchen/bathroom service page.

These three images were generated with the built-in image-generation tool, then converted with Sharp to 1440 × 960 WebP files. They are labelled as design concepts. The original wine-room photo now appears only in the homepage's completed-work feature. Full generation prompts are recorded in `IMAGE-PROMPTS.md`.
