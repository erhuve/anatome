# UI/UX copy and space audit

Audited November 2, 2026, including a follow-up review at phone viewport sizes.

## Rule for visible copy

Text should identify something, help someone take the next action, teach a specific fact, explain a meaningful state, or provide a reference. Do not add a paragraph to make a panel look complete. General instructions belong in Help unless they are needed for the current action.

## Findings and changes

| Surface | Finding | Implemented change |
| --- | --- | --- |
| Study notes | 541 of 700 assembly targets used the identical shape/position/laterality fallback. | Removed the fallback at its source. Targets without a specific note show their name, region, anatomy reference, and self-check action. No placeholder paragraph replaces it. |
| Study panel | A second “LOOK CLOSELY” block repeated the same advice, and a footnote repeated how study affects progress. | Removed both. General target and progress guidance is available in Help. |
| Study navigation | “Next structure” appeared in the panel alongside footer navigation. | Kept footer navigation during exploration. Feedback still provides a primary next action. |
| Quiz and self-check | Large instructions restated the question and explained the same blue highlight on every target. | Removed the repeated paragraph. Kept the actual question, answer controls, side/part/number requirements, and meaningful loading/error states. |
| Quiz feedback | Generic “explanations” appeared after every answer; ready-state and feedback text added motivational filler. | Feedback retains the result, correct identity, accepted-typo notice when relevant, and any real anatomical note. Removed the generic encouragement. |
| Typography | The desktop question heading was 36 px and competed with the specimen and answers. | Reduced it to 28 px, with smaller responsive sizes and tighter purposeful spacing. |
| Help | Essential guidance was mixed with several long source and storage paragraphs. | Renamed the entry “Help & sources”; made controls scannable; grouped sources/coverage and saving details in disclosures. Included the disclosures in keyboard focus handling. |
| Settings and structure browser | Eyebrows and introductory prose repeated the dialog title. Rows repeated names and showed presentation implementation details. | Used direct headings; changed row metadata to anatomical regions; retained specimen context for landmarks; removed 3D/isolation/context badges. Laterality choices show distinct specimen names. |
| Progress and history | Repeated titles, captions, generic row messages, and large navigation cards displaced actual records. | Removed duplication, kept metric/review definitions and specimen context in side-question history, and replaced the navigation cards with direct links. |
| Review empty state | Filtering a nonempty due-review list could incorrectly claim there were no reviews due. | Distinguished no matches from no due reviews and retained a clear-filters action. |
| Meme gallery | A marketing-style hero, statistics block, and repeated introduction delayed the gallery. | Replaced them with a compact title and real counts. Kept filters and search prominent. |
| Meme lessons and quizzes | Generic lesson headings and repeated instructions added bulk. Lesson facts appeared above quiz answers. | Kept actual notes, memory hooks, explanations, references, and credits. Showed the lesson connection in Study only, reduced the 3D link to one action, and removed empty progress placeholders. |
| Shared header | Progress and Memes displayed generic slogans in the collection-navigation position. | Removed the slogans and preserved action alignment. |
| Landscape study | Hiding the footer removed the only exploration navigation; a more specific rule kept the study panel capped at 52% height. | Kept study navigation visible and let the panel use the landscape column height. Verified Next and Finish. |
| Phone settings | Fixed controls could push the Save footer below the clipped edge at 320 × 568. | Put the selection controls and targets in a scrollable body, keeping Save outside it. Desktop retains the separately scrolling target list. |
| Phone gallery | Expanded topic filters and a duplicate topic breakdown filled the first screen. | Collapsed topics on phones, including landscape; kept the active topic visible; added counts to the chips; removed the duplicate breakdown. Selecting a topic closes the picker and restores focus. |
| Small-phone model | Long multiple-choice names left very little specimen area. | Let the canvas use the area behind the floating view button on small, short phones. |

## Content retained

- 113 muscle descriptions, 46 skeletal descriptions, and all 20 landmark/laterality explanations.
- An anatomy reference for every one of the 720 targets, including those without a specific description.
- Actual meme lesson facts, memory hooks, answer explanations, source links, and image credits.
- Loading and failure recovery, storage/sync warnings, coverage definitions, answer requirements, and attribution.

## Validation

- Production TypeScript/Vite build passed.
- All 124 existing tests passed, plus anatomy integration, source-geometry, and target-visibility checks.
- Rendered all 720 study targets to verify that specific notes and references remain, no generic fallback survives, and no empty explanation paragraphs render.
- Inspected the local desktop quiz visually and the study/browser accessibility states. The quiz instruction paragraph and study fallback blocks are absent.
- Visually reviewed the current production components in Safari at 320 × 568, 390 × 844, and 740 × 360, using a separate guest test origin. Reviewed long structure names and choices, typed answers, feedback, study notes, navigation, completion, view controls, settings, help, the structure browser, the gallery, and progress.
- Verified typing with 220 px removed from the preview height: the smallest phone retained a visible input and submit action with 160 px of model space. This simulates the reduced viewport; it does not exercise a physical phone's software keyboard or browser chrome.
- Retested the settings footer visually after scrolling and checked that choosing a phone topic closes the picker, retains the chosen label, and filters the gallery.

## Remaining opportunities

1. Author verified structure-specific notes for the 349 muscle and 192 skeletal targets that currently have none. This is a content gap; generic prose should not conceal it.
2. Perform a hardware smoke test in iOS Safari and Android Chrome to cover real browser chrome, the software keyboard, and touch gestures beyond the phone-sized desktop preview.
3. Keep future copy reviews grounded in purpose: explain unfamiliar controls in Help, show status only when it changes a decision, and keep educational explanations specific to the current material.
