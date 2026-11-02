# Mobile practice layout

Quiz and 3D self-check screens use a bounded visible viewport rather than a
scrolling column. The specimen takes the remaining height above an answer tray.
Typed input and Check answer share a row. Multiple choice uses two columns.
Camera, framing, and opacity controls open over the specimen through View & layers.
The full instructions remain available to assistive technology; secondary hints
are removed from the compact visual layout. Submitted answers show feedback and
a separate Next action. Long feedback can scroll inside its own region while
Next remains visible. Summary screens and study reading may scroll their content.

`src/mobile.css` applies to widths up to 760 px and short landscape viewports up
to 1000 px. Ordinary desktop layout and the scrolling meme library are retained.
`ModelControls` shares the same camera controls between desktop and mobile.

`bindPracticeViewport` tracks VisualViewport resize/scroll and layout resize,
setting the visible height and top offset. It ignores pinch zoom and resets its
height baseline after orientation changes. The viewport meta tag also requests
`interactive-widget=resizes-content` where supported. While a focused input loses
more than 120 px of viewport height, secondary navigation is collapsed. Typing
never disables zoom, and phone inputs use 16 px text. Text fields are not focused
automatically on phones. Submitting blurs the field to dismiss the keyboard.

Validation: unit tests cover visual-only and combined layout/visual keyboard
resizing, orientation, pinch zoom, fallback without VisualViewport, and cleanup.
Browser layout checks measure the model and input/submit/choice/Next rectangles
against both the visible frame and their containing panel. Phone frames include
320×568 (including the longest answer labels), 360×640, 412×680, a
keyboard-height simulation at 412×350, and landscape at 740×360.
Camera resizing preserves the current orbit angle, pan, and relative zoom. These are
browser simulations; a physical Samsung keyboard/browser was not available for
verification in this environment.
