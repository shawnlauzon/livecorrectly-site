---
name: bg5-shadows
description: BG5 functions & shadows (the 10 conditioning patterns) and the Bridging Traits/Strengths shadow #1 logic (bridgingGates, harmonic gates, bridge descriptions). Load before touching shadow, function, bridge, or top_shadow code in lib/hd-chart, the admin subscriber view, or newsletter variables.
---

# BG5 Functions & Shadows

In BG5 (business-focused Human Design), **functions** are the 9 centers, and **shadows** are the conditioning patterns that appear when a function is undefined/open. The admin UI displays up to 10 functions with their shadow names in priority order:

| # | Function (center) | Shadow (conditioning pattern) |
|---|---|---|
| 1 | **Bringing Traits/Strengths** (conditional) | Near: Blaming yourself for something missing / Far: Blaming others and becoming a victim |
| 2 | **Willpower** (Ego undefined) | Overcompensating |
| 3 | **Emotional Intelligence** (Solar Plexus undefined) | Touchy & nervous |
| 4 | **Identity & Direction** (G Center undefined) | Role confusion |
| 5 | **Survival Instinct** (Spleen undefined) | Unable to let go |
| 6 | **Conceptualization** (Ajna undefined) | Mentally defensive |
| 7 | **Inspiration** (Head undefined) | Losing focus |
| 8 | **Drive & Stamina** (Root undefined) | Too much in a hurry |
| 9 | **Energy Resource** (Sacral undefined) | Over zealous |
| 10 | **Communication & Action** (Throat undefined) | Trying to be the star |

## Bridge Descriptions (Shadow #1)

The **Bringing Traits/Strengths** shadow has unique logic. It's about **bridging gates** — gates the person has where they're missing the harmonic partner to complete a channel. This creates a feeling of incompleteness.

**Critical concept**: `chart.bridges.bridgingGates` is an array of gate numbers the person **DOESN'T have** (wishes they had). These are the missing harmonic partners. The person HAS the other gate in each channel pair.

Example:
- `bridgingGates = [8]` means they're missing gate 8 (Contribution)
- They DO have gate 1 (Creative Self-Expression)
- They can't complete the 1-8 channel (Inspiration)
- Description: "If only you contributed more, you believe you could really inspire. You worry that your natural ability to express yourself creatively isn't enough."

**Implementation**:
- `lib/hd-chart/bridge-descriptions.ts` — all 64 gate descriptions, indexed by the gate they HAVE (not the missing gate)
- `lib/hd-chart/constants.ts` — `gateTraits` mapping (trait, harmonic gate, harmonic trait, strength)
- `lib/hd-chart/index.ts` — `getBridgeDescriptions()` function:
  1. Takes each gate from `bridgingGates` (the missing gate)
  2. Finds its harmonic partner(s) in `gateTraits`
  3. Checks which harmonic the person HAS in their chart
  4. Returns the description indexed by the gate they HAVE
- `app/admin/[id]/page.tsx` — displays bridge details in the Shadows section (only for shadow #1)

**Multi-harmonic gates**: Gates 10, 20, 34, 57 each have 3 possible harmonic partners. The function checks which one the person has and returns the appropriate description from the array.
