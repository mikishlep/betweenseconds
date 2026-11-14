# Combat art / version 4

Generated with built-in image_gen; these are prototype assets, not designer-authored final art. Prompts are in generation.json. A final background-removal pass retained the poses and transparent alpha; original generator outputs remain in the Codex generated_images folder.

- enemy-animations.png: eight columns. The first two used row bands are y=0..224 and y=224..420. The bottom unused variant is superseded by the selected boss sheet.
- boss-animations.png: eight columns, three 256px rows: Bloom Warden, Echo, Last Regent.
- vfx.png: six columns, four equal rows: Arrow, Petal, RoseSweep, Bloom.
- Per character columns: Idle 0/1, Walk 2/3/4, Windup 5, Attack 6/7. These are side-facing poses reflected in code; four-direction enemy animation sets have not been drawn.

Run tools/import_combat_v4.py last in the import pipeline. It uses one shared crop/scale per row, preserves source alpha, and samples with nearest-neighbor. Ordinary enemies use 64x64 canvases; bosses 96x128. Runtime size compensates for different source silhouettes to keep ordinary bodies near the hero's size. Ground warning masks are code-authored to match attack geometry.

Current campaign: Shooter, Hunter, Bloom Warden. Echo/Regent animations are registered for future encounters only.
