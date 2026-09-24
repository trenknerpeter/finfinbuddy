# Keep position when changing percentages

## Goal
Changing the withdrawal percentage or any other calculator input updates the shareable address without moving the page.

## Changes
- Replace the direct browser-history update in the shared scenario hook with TanStack Router navigation.
- Mark that address update as a replacement and explicitly disable scroll resetting.
- Remove the immediate manual scroll restoration, which currently runs before the router’s later reset and therefore cannot prevent the jump.
- Mark the withdrawal quick-pick controls as non-submit buttons for safe behavior.

## Verification
- Open Invest, scroll to “What it pays you,” and click 3%, 4%, 4.5%, and 5%.
- Confirm the visible section and scroll position remain stable while results and the address update.
- Confirm the same behavior while dragging the withdrawal slider and changing another calculator field.
- Check the current build diagnostics for errors.
