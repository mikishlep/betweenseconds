"""Package only Construct runtime assets, never node_modules or editor UI state."""
import json
import zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def package(destination=None):
    destination = Path(destination) if destination else ROOT / 'dist/BetweenSeconds-Prototype7.c3p'
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.write(ROOT / 'project.c3proj', 'project.c3proj')
        for folder in ('objectTypes', 'layouts', 'eventSheets', 'scripts', 'images', 'icons', 'timelines', 'flowcharts'):
            for file in sorted((ROOT / folder).rglob('*')):
                if file.is_file() and not file.name.endswith('.uistate.json') and not file.name.startswith('.'):
                    archive.write(file, file.relative_to(ROOT))
    print(destination)
    return destination
if __name__ == '__main__':
    package()
