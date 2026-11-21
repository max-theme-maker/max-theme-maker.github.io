# Max Theme Maker

Design color themes for [Max](https://cycling74.com/products/max) and save them as `.maxtheme` files that Max loads directly.

- Every one of Max's ~280 interface colors and 23 object style colors can be edited.
- A live preview shows the whole interface on one page: patcher window, object boxes, inlets and outlets, console, inspector and sidebar, code editor, menus, Max for Live objects. Click anything in it to edit its colors.
- The **Generator** runs Max's own theme engine (`theme_constructor.js`): 13 core colors rebuild the whole theme. Colors you edit by hand are pinned and left alone.
- **Adjust all** shifts hue, saturation, lightness or contrast of the whole theme.
- Three layouts: **Preview** (the interface fills the page, all colors in a drawer), **Swatches** (every color as a swatch, grouped by area), **Areas** (one part of Max at a time).

It runs entirely in your browser. Nothing is uploaded.

## Use it

1. Open the page and click **Choose the interfaces folder…**. Pick the `interfaces` folder inside your Max app — in the macOS file dialog press ⌘⇧G and paste `/Applications/Max.app/Contents/Resources/C74/interfaces` (adjust the app name if yours differs). This is done once; the page remembers it.
2. Open a theme that ships with Max, or one of yours, and edit it.
3. **Save to Max** (Chrome, Edge, Opera): the first time, choose your `Documents/Max 9/Packages` folder. Themes go to `Packages/Custom Themes/interfaces/themes`.
   In other browsers, **Download** the file and move it to that folder yourself.
4. Restart Max and pick the theme in **Preferences › Interface Color Theme**.

## Why it asks for your Max folder

The themes that ship with Max and its theme engine belong to Cycling '74, so they are not included here. The page reads them from your own installation and keeps a copy in your browser's storage (IndexedDB). They never leave your computer.

## How the preview was calibrated

Where a color is drawn was measured in Max 9.2 with a diagnostic theme in which every color has a unique code, then decoding screenshots. For example: object boxes have 4 pt `accentcolor` bands at the top and bottom; `bgfillcolor` only fills message boxes, umenu and panel (and with type "color", Max draws `bgfillcolor_color2`); inlets and outlets sit inside those bands; hovering a box in edit mode draws a 4 pt frame in `patcher_box_selection` at 40 % opacity.

Files are always written with floats (`1.0`, never `1`): Max misreads integer color values.

## Run it locally

Any static file server works:

```bash
python3 -m http.server 8790
```

then open <http://localhost:8790>.

## License

[0BSD](LICENSE). Use it for anything; no attribution required.

Not affiliated with Cycling '74. Max is a trademark of Cycling '74.
