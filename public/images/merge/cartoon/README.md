# Original cartoon Merge artwork

This set contains 32 original SVG illustrations: eight existing item tiers in
each of the `heroes`, `paper`, `tools`, and `creatures` chains. The filenames and
item names preserve the game's existing identities. The previous WebP artwork
and its generation prompts remain in the parent directory.

The drawings share a transparent 128 × 128 viewBox, forest-green rounded
outlines, warm ivory and pastel fills, and simple grounded shadows. Heroes and
creatures have expressive faces; item silhouettes grow distinctively between
tiers. There are no embedded fonts, external resources, stock assets, or raster
images. SVG titles name the objects when the files are viewed directly; the
game's board labels remain the accessible names when used as decorative images.

Rebuild and validate the complete set with:

```sh
python3 scripts/generate-cartoon-art.py
```

The editable source is `scripts/generate-cartoon-art.py`. Generation validates
the XML, expected viewBox, absence of embedded images/scripts, and eight tiers
per chain. No dependencies beyond the Python standard library are required.

## License

SPDX-License-Identifier: CC0-1.0

The original artwork in this directory and its generator are dedicated to the
public domain under CC0 1.0 Universal. To the extent possible under law, all
copyright and related or neighboring rights in these original files are waived.
You may copy, modify, distribute and use them, including commercially, without
asking permission or providing attribution. This dedication covers only this
SVG set and its generator, not other project assets or third-party material.

License text: https://creativecommons.org/publicdomain/zero/1.0/legalcode
