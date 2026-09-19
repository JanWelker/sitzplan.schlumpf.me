#!/usr/bin/env python3
"""Regenerate src/lib/layout/data/seatPositions.{nr,sr}.json from the
Parliamentary Services' own official seat-plan PDFs.

Each seat number is printed as real, positioned text in those PDFs (not part
of an image), so its on-page coordinates can be read directly rather than
approximated. This is what makes the rendered hemicycle physically accurate
to the real room, including the front-row officer/secretary seats, instead
of an invented layout.

Usage:
    python3 -m venv venv && source venv/bin/activate
    pip install pymupdf requests
    python3 scripts/extract-seat-positions.py

Re-run this whenever parlament.ch republishes updated seat plans (e.g. after
a room reorganization), then re-check the digitized ranges below still match
the live API's SeatOrganisationNr/Sr SeatNumber values.
"""

import json
import math
import sys
from pathlib import Path

import pymupdf
import requests

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "src" / "lib" / "layout" / "data"

# Source: https://www.parlament.ch/de/organe/sitzordnungen
CHAMBERS = {
    "nr": {
        "url": "https://www.parlament.ch/centers/documents/de/sitzplan-nr.pdf",
        # Legend/header text blocks that also contain bare digits and must
        # not be mistaken for seat numbers, as (x0, y0, x1, y1) page regions.
        "exclude_regions": [(1000, 780, 1190, 842), (0, 700, 160, 842)],
        # The live API's SeatOrganisationNr rows use seat numbers 1-200 with
        # no gaps; everything the PDF prints in that range is a real seat.
        "valid_seats": set(range(1, 201)),
    },
    "sr": {
        "url": "https://www.parlament.ch/centers/documents/de/sitzplan-sr.pdf",
        "exclude_regions": [],
        # Confirmed against the live API's SeatOrganisationSr rows: seats
        # 1-45 and 47 are Ständerat council seats; the PDF also prints a few
        # higher numbers for Bundesrat/administration seats which are not
        # council seats and must be excluded.
        "valid_seats": set(range(1, 46)) | {47},
    },
}


def extract_seat_words(path: Path, exclude_regions: list[tuple[float, float, float, float]]):
    """Cluster the PDF's positioned text into per-seat (number, x, y) points."""
    doc = pymupdf.open(path)
    page = doc[0]
    words = page.get_text("words")  # (x0, y0, x1, y1, word, block_no, line_no, word_no)

    def excluded(w):
        cx, cy = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
        return any(rx0 <= cx <= rx1 and ry0 <= cy <= ry1 for rx0, ry0, rx1, ry1 in exclude_regions)

    words = [w for w in words if not excluded(w)]
    words.sort(key=lambda w: (w[5], w[6], w[7]))
    numeric = [w for w in words if w[4].isdigit()]

    def center(w):
        return (w[0] + w[2]) / 2, (w[1] + w[3]) / 2

    def dist(a, b):
        ax, ay = center(a)
        bx, by = center(b)
        return math.hypot(ax - bx, ay - by)

    # A rotated multi-digit seat number can be split into separate word
    # entries (e.g. "2" and "00") close together in reading order — merge
    # adjacent short numeric fragments back into one seat number.
    clusters: list[list[tuple]] = []
    for w in numeric:
        if clusters and dist(clusters[-1][-1], w) < 14 and len("".join(x[4] for x in clusters[-1])) < 3:
            clusters[-1].append(w)
        else:
            clusters.append([w])

    points = []
    for c in clusters:
        num = "".join(x[4] for x in c)
        xs = [x[0] for x in c] + [x[2] for x in c]
        ys = [x[1] for x in c] + [x[3] for x in c]
        points.append({"seat": int(num), "x": sum(xs) / len(xs), "y": sum(ys) / len(ys)})
    return points


def normalize(points: list[dict], valid_seats: set[int]) -> dict[str, list[float]]:
    """Translate raw PDF coordinates so (0, 0) is the horizontal center of
    the front row (roughly the podium), x is left/right, and y is negative
    toward the back of the room — matching PDF points where larger y is
    lower on the page, i.e. closer to the front."""
    points = [p for p in points if p["seat"] in valid_seats]
    xs = [p["x"] for p in points]
    origin_x = (min(xs) + max(xs)) / 2
    origin_y = max(p["y"] for p in points)  # front row sits at the page's largest y
    return {
        str(p["seat"]): [round(p["x"] - origin_x, 2), round(p["y"] - origin_y, 2)] for p in points
    }


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for chamber, cfg in CHAMBERS.items():
        pdf_path = DATA_DIR / f"sitzplan-{chamber}.pdf"
        if not pdf_path.exists():
            print(f"downloading {cfg['url']}")
            resp = requests.get(cfg["url"], timeout=30)
            resp.raise_for_status()
            pdf_path.write_bytes(resp.content)

        points = extract_seat_words(pdf_path, cfg["exclude_regions"])
        positions = normalize(points, cfg["valid_seats"])

        found = set(int(k) for k in positions)
        missing = cfg["valid_seats"] - found
        if missing:
            print(f"WARNING: {chamber} is missing seats {sorted(missing)}", file=sys.stderr)

        out_path = DATA_DIR / f"seatPositions.{chamber}.json"
        out_path.write_text(json.dumps(positions, indent=2, sort_keys=True) + "\n")
        print(f"wrote {out_path} ({len(positions)} seats)")
        print(f"run `npx prettier --write {out_path}` to match the repo's formatting")

        pdf_path.unlink()  # the PDF itself isn't committed, only the digitized positions


if __name__ == "__main__":
    main()
