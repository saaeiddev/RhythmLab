from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parents[1]
out=root/'dist'/'RhythmLab-0.2.0-Premiere-26.2.2.zip'
out.parent.mkdir(exist_ok=True)
# Release bundle: installable UXP source + end-user docs/license.
# Tests and synthetic media remain in the GitHub repository but are intentionally
# excluded from the release ZIP to keep the downloadable package lightweight.
include=['plugin','README.md','LICENSE','CHANGELOG.md','docs','package.json']
with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=9) as z:
    for name in include:
        p=root/name
        if p.is_file():
            z.write(p,p.relative_to(root))
        elif p.exists():
            for f in p.rglob('*'):
                if f.is_file():
                    z.write(f,f.relative_to(root))
print(out)
