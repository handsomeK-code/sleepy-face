# UI Guidelines

## Screens must be responsive and flexible

Every screen implementation (not just what a design mockup shows at one fixed canvas size) must adapt to different device sizes, orientations, system font/accessibility sizes, and keyboard state. A screen that only looks correct at the exact pixel dimensions of the Figma/design export is not done.

Concretely:

- Wrap screen content in a `ScrollView` (with `contentContainerStyle` doing the layout, e.g. `flexGrow: 1`) whenever the content's height could exceed the viewport — large accessibility font sizes, short or landscape devices, or a keyboard covering part of the screen. Don't rely on a plain `View` with `flex: 1` for anything but the most trivially short screens.
- Use `flex`, `flexGrow`, `gap`, and percentage/stretch sizing for layout. Don't hardcode container widths/heights that assume one specific screen size.
- Fixed pixel sizes are fine only for elements that are intentionally a constant size regardless of screen width — icons, avatars, a logo mark — not for containers, inputs, or buttons, which should stretch to the available width.
- Text must be allowed to wrap; don't cap it with a fixed-height container that would clip it at larger font sizes.

When translating a design file (SVG/Figma export) into a screen, treat its pixel positions as a guide to proportions and hierarchy (what's grouped together, roughly how much space each section gets), not as literal absolute coordinates to hardcode.
