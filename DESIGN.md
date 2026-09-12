# Apex investor redesign

## Direction
Bold architectural editorial design: oversized condensed typography, charcoal, warm parchment, bronze, strong grids and the original gold Apex identity. Hero: “SEE THE POTENTIAL. BUILD IT.” The real wine-room photograph anchors the work section. Generated imagery is clearly distinguished from completed work.

## Audience and scope
North Alabama homeowners and investors renovating single-family homes, duplexes and fourplexes to rent, sell or live in. Services cover whole-home renovations, kitchens, bathrooms, framing, structural coordination, decks, windows, doors, siding, systems and finishes. Ground-up construction is explicitly a future capability after required licensing is in place. No invented testimonials, license numbers, returns or completed-project counts.

## Interaction
A lazy-loaded property model offers three property types, three viewing modes, drag rotation, keyboard-operable rotation buttons and reset. It renders only when needed and respects reduced motion. A software renderer keeps the controls useful without WebGL. The inquiry page uses three clear sections on one page, visible field labels, practical project choices and retry-safe submission.

## Existing systems
The protected owner inbox at `/inbox/`, backend contract, original authentication and separate client portal link are retained. This is an Astro/Express application for GitHub and Railway. The redesign does not introduce a Netlify form or change the client portal.
