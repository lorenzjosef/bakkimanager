#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET


KML_NS = {"kml": "http://www.opengis.net/kml/2.2"}


@dataclass(frozen=True)
class Point:
    lon: float
    lat: float


@dataclass(frozen=True)
class PlacemarkPolygon:
    name: str
    points: list[Point]
    source_feature_name: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build Bakki geometry seed JSON from KML inputs.")
    parser.add_argument("--ranch-kml", default="ranch coordinates.kml", help="Path to ranch boundary KML.")
    parser.add_argument("--zones-kml", default="zones.kml", help="Path to zones KML.")
    parser.add_argument(
        "--out",
        default="docs/seeds/geometry-seed.json",
        help="Output JSON path.",
    )
    parser.add_argument(
        "--ranch-name",
        default="Bakki Ranch",
        help="Canonical ranch name to emit in the seed payload.",
    )
    parser.add_argument(
        "--ranch-code",
        default="BAKKI-RANCH",
        help="Canonical ranch code to emit in the seed payload.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if the generated seed fails containment/overlap validation.",
    )
    parser.add_argument(
        "--summary-only",
        action="store_true",
        help="Print only the validation summary instead of writing the full seed file.",
    )
    parser.add_argument(
        "--debug-out",
        help="Optional GeoJSON output path for visualizing ranch/zone validation failures.",
    )
    parser.add_argument(
        "--debug-html-out",
        help="Optional self-contained HTML output path for visualizing ranch/zone validation failures.",
    )
    return parser.parse_args()


def parse_kml_polygons(path: Path) -> list[PlacemarkPolygon]:
    root = ET.parse(path).getroot()
    placemarks: list[PlacemarkPolygon] = []

    for placemark in root.findall(".//kml:Placemark", KML_NS):
      name = (placemark.findtext("kml:name", default="", namespaces=KML_NS) or "").strip()
      coordinates_nodes = placemark.findall(".//kml:Polygon/kml:outerBoundaryIs/kml:LinearRing/kml:coordinates", KML_NS)
      for coordinates_node in coordinates_nodes:
          points = parse_coordinates_block(coordinates_node.text or "")
          if len(points) < 4:
              continue
          placemarks.append(
              PlacemarkPolygon(
                  name=name or path.stem,
                  points=ensure_closed(points),
                  source_feature_name=name or path.stem,
              )
          )

    return placemarks


def parse_coordinates_block(raw: str) -> list[Point]:
    points: list[Point] = []
    for chunk in raw.replace("\n", " ").split():
        lon_str, lat_str, *_ = chunk.split(",")
        points.append(Point(lon=float(lon_str), lat=float(lat_str)))
    return points


def ensure_closed(points: list[Point]) -> list[Point]:
    if not points:
        return points
    if points[0] == points[-1]:
        return points
    return [*points, points[0]]


def slugify(value: str) -> str:
    value = value.lower().strip()
    cleaned = []
    last_dash = False
    for char in value:
        if char.isalnum():
            cleaned.append(char)
            last_dash = False
        elif not last_dash:
            cleaned.append("-")
            last_dash = True
    slug = "".join(cleaned).strip("-")
    return slug or "unnamed"


def ring_to_wkt(points: list[Point]) -> str:
    coords = ", ".join(f"{point.lon:.15f} {point.lat:.15f}" for point in ensure_closed(points))
    return f"POLYGON (({coords}))"


def polygon_area_hectares(points: list[Point]) -> float:
    projected = project_points(points)
    area_square_meters = abs(shoelace_area(projected))
    return area_square_meters / 10_000


def project_points(points: list[Point]) -> list[tuple[float, float]]:
    lat0 = math.radians(sum(point.lat for point in points[:-1]) / max(1, len(points) - 1))
    mean_lat_scale = math.cos(lat0)
    projected: list[tuple[float, float]] = []
    for point in points:
        x = math.radians(point.lon) * 6_371_008.8 * mean_lat_scale
        y = math.radians(point.lat) * 6_371_008.8
        projected.append((x, y))
    return projected


def shoelace_area(points: list[tuple[float, float]]) -> float:
    area = 0.0
    for index in range(len(points) - 1):
        x1, y1 = points[index]
        x2, y2 = points[index + 1]
        area += (x1 * y2) - (x2 * y1)
    return area / 2


def bbox(points: list[Point]) -> dict[str, float]:
    lons = [point.lon for point in points[:-1]]
    lats = [point.lat for point in points[:-1]]
    return {
        "min_lon": min(lons),
        "min_lat": min(lats),
        "max_lon": max(lons),
        "max_lat": max(lats),
    }


def point_in_polygon(point: Point, polygon: list[Point]) -> bool:
    for index in range(len(polygon) - 1):
        if point_on_segment(point, polygon[index], polygon[index + 1]):
            return True

    inside = False
    for index in range(len(polygon) - 1):
        a = polygon[index]
        b = polygon[index + 1]
        intersects = ((a.lat > point.lat) != (b.lat > point.lat)) and (
            point.lon < ((b.lon - a.lon) * (point.lat - a.lat) / ((b.lat - a.lat) or 1e-12) + a.lon)
        )
        if intersects:
            inside = not inside
    return inside


def orientation(a: Point, b: Point, c: Point) -> float:
    return (b.lon - a.lon) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lon - a.lon)


def on_segment(a: Point, b: Point, c: Point) -> bool:
    return (
        min(a.lon, c.lon) <= b.lon <= max(a.lon, c.lon)
        and min(a.lat, c.lat) <= b.lat <= max(a.lat, c.lat)
    )


def point_on_segment(point: Point, a: Point, b: Point) -> bool:
    cross = orientation(a, b, point)
    if abs(cross) > 1e-12:
        return False
    return on_segment(a, point, b)


def segments_intersect(a1: Point, a2: Point, b1: Point, b2: Point) -> bool:
    o1 = orientation(a1, a2, b1)
    o2 = orientation(a1, a2, b2)
    o3 = orientation(b1, b2, a1)
    o4 = orientation(b1, b2, a2)

    if (o1 > 0) != (o2 > 0) and (o3 > 0) != (o4 > 0):
        return True

    if o1 == 0 and on_segment(a1, b1, a2):
        return True
    if o2 == 0 and on_segment(a1, b2, a2):
        return True
    if o3 == 0 and on_segment(b1, a1, b2):
        return True
    if o4 == 0 and on_segment(b1, a2, b2):
        return True

    return False


def segments_cross_strictly(a1: Point, a2: Point, b1: Point, b2: Point) -> bool:
    o1 = orientation(a1, a2, b1)
    o2 = orientation(a1, a2, b2)
    o3 = orientation(b1, b2, a1)
    o4 = orientation(b1, b2, a2)
    return (o1 > 0) != (o2 > 0) and (o3 > 0) != (o4 > 0)


def polygons_overlap(a: list[Point], b: list[Point]) -> bool:
    for idx_a in range(len(a) - 1):
        for idx_b in range(len(b) - 1):
            if segments_cross_strictly(a[idx_a], a[idx_a + 1], b[idx_b], b[idx_b + 1]):
                return True
    return point_strictly_in_polygon(representative_point(a), b) or point_strictly_in_polygon(representative_point(b), a)


def validate_containment(container: list[Point], polygon: list[Point]) -> bool:
    return all(point_in_polygon(point, container) for point in polygon[:-1])


def point_strictly_in_polygon(point: Point, polygon: list[Point]) -> bool:
    if any(point_on_segment(point, polygon[index], polygon[index + 1]) for index in range(len(polygon) - 1)):
        return False
    return point_in_polygon(point, polygon)


def representative_point(points: list[Point]) -> Point:
    vertices = points[:-1]
    return Point(
        lon=sum(point.lon for point in vertices) / len(vertices),
        lat=sum(point.lat for point in vertices) / len(vertices),
    )


def pairwise_overlap_names(polygons: list[PlacemarkPolygon]) -> list[list[str]]:
    overlaps: list[list[str]] = []
    for left_index in range(len(polygons)):
        for right_index in range(left_index + 1, len(polygons)):
            if polygons_overlap(polygons[left_index].points, polygons[right_index].points):
                overlaps.append([polygons[left_index].name, polygons[right_index].name])
    return overlaps


def outside_vertices(container: list[Point], polygon: PlacemarkPolygon) -> list[dict[str, float | int]]:
    return [
        {"vertex_index": index, "lon": point.lon, "lat": point.lat}
        for index, point in enumerate(polygon.points[:-1])
        if not point_in_polygon(point, container)
    ]


def polygon_crossing_details(a: PlacemarkPolygon, b: PlacemarkPolygon) -> dict | None:
    crossings: list[dict[str, object]] = []
    for idx_a in range(len(a.points) - 1):
        for idx_b in range(len(b.points) - 1):
            if segments_cross_strictly(a.points[idx_a], a.points[idx_a + 1], b.points[idx_b], b.points[idx_b + 1]):
                crossings.append(
                    {
                        "left_segment_index": idx_a,
                        "right_segment_index": idx_b,
                        "left_start": {"lon": a.points[idx_a].lon, "lat": a.points[idx_a].lat},
                        "left_end": {"lon": a.points[idx_a + 1].lon, "lat": a.points[idx_a + 1].lat},
                        "right_start": {"lon": b.points[idx_b].lon, "lat": b.points[idx_b].lat},
                        "right_end": {"lon": b.points[idx_b + 1].lon, "lat": b.points[idx_b + 1].lat},
                    }
                )

    if not crossings:
        return None

    return {
        "left": a.name,
        "right": b.name,
        "strict_crossing_count": len(crossings),
        "strict_crossings": crossings,
    }


def pairwise_overlap_details(polygons: list[PlacemarkPolygon]) -> list[dict]:
    overlaps: list[dict] = []
    for left_index in range(len(polygons)):
        for right_index in range(left_index + 1, len(polygons)):
            detail = polygon_crossing_details(polygons[left_index], polygons[right_index])
            if detail is not None:
                overlaps.append(detail)
    return overlaps


def polygon_self_intersection_details(polygon: PlacemarkPolygon) -> dict | None:
    intersections: list[dict[str, int]] = []
    segment_count = len(polygon.points) - 1

    for left_index in range(segment_count):
        for right_index in range(left_index + 1, segment_count):
            if right_index == left_index + 1:
                continue
            if left_index == 0 and right_index == segment_count - 1:
                continue

            if segments_intersect(
                polygon.points[left_index],
                polygon.points[left_index + 1],
                polygon.points[right_index],
                polygon.points[right_index + 1],
            ):
                intersections.append(
                    {
                        "left_segment_index": left_index,
                        "right_segment_index": right_index,
                    }
                )

    if not intersections:
        return None

    return {
        "zone": polygon.name,
        "intersection_count": len(intersections),
        "segment_pairs": intersections,
    }


def serializable_points(points: Iterable[Point]) -> list[dict[str, float]]:
    return [{"lon": point.lon, "lat": point.lat} for point in points]


def build_seed_payload(args: argparse.Namespace) -> dict:
    ranch_polygons = parse_kml_polygons(Path(args.ranch_kml))
    zone_polygons = parse_kml_polygons(Path(args.zones_kml))

    if len(ranch_polygons) != 1:
        raise SystemExit(f"Expected exactly 1 ranch polygon in {args.ranch_kml}, found {len(ranch_polygons)}.")
    if not zone_polygons:
        raise SystemExit(f"No zone polygons found in {args.zones_kml}.")

    ranch = ranch_polygons[0]
    ranch_payload = {
        "name": args.ranch_name,
        "code": args.ranch_code,
        "source_file_name": Path(args.ranch_kml).name,
        "source_feature_name": ranch.source_feature_name,
        "boundary_geometry_wkt": ring_to_wkt(ranch.points),
        "boundary_coordinates": serializable_points(ranch.points),
        "area_hectares_estimate": round(polygon_area_hectares(ranch.points), 3),
        "bbox": bbox(ranch.points),
    }

    zones_payload = []
    for index, zone in enumerate(zone_polygons, start=1):
        zones_payload.append(
            {
                "name": zone.name,
                "code": f"ZONE-{index}",
                "source_file_name": Path(args.zones_kml).name,
                "source_feature_name": zone.source_feature_name,
                "geometry_wkt": ring_to_wkt(zone.points),
                "boundary_coordinates": serializable_points(zone.points),
                "area_hectares_estimate": round(polygon_area_hectares(zone.points), 3),
                "bbox": bbox(zone.points),
            }
        )

    containment_failure_details = []
    for zone in zone_polygons:
        failed_vertices = outside_vertices(ranch.points, zone)
        if failed_vertices:
            containment_failure_details.append(
                {
                    "zone": zone.name,
                    "outside_vertex_count": len(failed_vertices),
                    "outside_vertices": failed_vertices,
                }
            )
    containment_failures = [entry["zone"] for entry in containment_failure_details]
    overlap_details = pairwise_overlap_details(zone_polygons)
    overlap_pairs = [[entry["left"], entry["right"]] for entry in overlap_details]
    invalid_zone_geometry_details = [
        detail
        for zone in zone_polygons
        if (detail := polygon_self_intersection_details(zone)) is not None
    ]
    invalid_zone_geometries = [entry["zone"] for entry in invalid_zone_geometry_details]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_files": {
            "ranch": Path(args.ranch_kml).name,
            "zones": Path(args.zones_kml).name,
        },
        "ranch": ranch_payload,
        "zones": zones_payload,
        "validation": {
            "ranch_polygon_count": len(ranch_polygons),
            "zone_polygon_count": len(zone_polygons),
            "zones_within_ranch": len(containment_failures) == 0,
            "containment_failures": containment_failures,
            "containment_failure_details": containment_failure_details,
            "invalid_zone_geometries": invalid_zone_geometries,
            "invalid_zone_geometry_details": invalid_zone_geometry_details,
            "zone_overlap_pairs": overlap_pairs,
            "zone_overlap_details": overlap_details,
        },
    }


def validation_summary(payload: dict) -> dict:
    validation = payload["validation"]
    return {
        "generated_at": payload["generated_at"],
        "source_files": payload["source_files"],
        "ranch_code": payload["ranch"]["code"],
        "zone_count": validation["zone_polygon_count"],
        "zones_within_ranch": validation["zones_within_ranch"],
        "containment_failures": validation["containment_failures"],
        "containment_failure_details": validation["containment_failure_details"],
        "invalid_zone_geometries": validation["invalid_zone_geometries"],
        "invalid_zone_geometry_details": validation["invalid_zone_geometry_details"],
        "zone_overlap_pairs": validation["zone_overlap_pairs"],
        "zone_overlap_details": validation["zone_overlap_details"],
        "valid": (
            validation["zones_within_ranch"]
            and len(validation["zone_overlap_pairs"]) == 0
            and len(validation["invalid_zone_geometries"]) == 0
        ),
    }


def build_debug_geojson(payload: dict) -> dict:
    ranch = payload["ranch"]
    zones = payload["zones"]
    validation = payload["validation"]

    features: list[dict] = [
        {
            "type": "Feature",
            "id": "ranch-boundary",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [point["lon"], point["lat"]]
                    for point in ranch["boundary_coordinates"]
                ]],
            },
            "properties": {
                "featureRole": "ranch_boundary",
                "name": ranch["name"],
                "sourceFeatureName": ranch["source_feature_name"],
            },
        }
    ]

    for zone in zones:
        features.append(
            {
                "type": "Feature",
                "id": zone["code"].lower(),
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [point["lon"], point["lat"]]
                        for point in zone["boundary_coordinates"]
                    ]],
                },
                "properties": {
                    "featureRole": "zone_boundary",
                    "zoneName": zone["name"],
                    "zoneCode": zone["code"],
                    "sourceFeatureName": zone["source_feature_name"],
                },
            }
        )

    for failure in validation["containment_failure_details"]:
        for vertex in failure["outside_vertices"]:
            features.append(
                {
                    "type": "Feature",
                    "id": f"containment-{slugify(failure['zone'])}-v{vertex['vertex_index']}",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [vertex["lon"], vertex["lat"]],
                    },
                    "properties": {
                        "featureRole": "containment_failure_vertex",
                        "zoneName": failure["zone"],
                        "vertexIndex": int(vertex["vertex_index"]),
                    },
                }
            )

    for overlap in validation["zone_overlap_details"]:
        for crossing in overlap["strict_crossings"]:
            features.append(
                {
                    "type": "Feature",
                    "id": f"overlap-{slugify(overlap['left'])}-{slugify(overlap['right'])}-left-{crossing['left_segment_index']}",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [crossing["left_start"]["lon"], crossing["left_start"]["lat"]],
                            [crossing["left_end"]["lon"], crossing["left_end"]["lat"]],
                        ],
                    },
                    "properties": {
                        "featureRole": "overlap_segment",
                        "zoneName": overlap["left"],
                        "pairedZoneName": overlap["right"],
                        "segmentSide": "left",
                        "segmentIndex": crossing["left_segment_index"],
                    },
                }
            )
            features.append(
                {
                    "type": "Feature",
                    "id": f"overlap-{slugify(overlap['left'])}-{slugify(overlap['right'])}-right-{crossing['right_segment_index']}",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [crossing["right_start"]["lon"], crossing["right_start"]["lat"]],
                            [crossing["right_end"]["lon"], crossing["right_end"]["lat"]],
                        ],
                    },
                    "properties": {
                        "featureRole": "overlap_segment",
                        "zoneName": overlap["right"],
                        "pairedZoneName": overlap["left"],
                        "segmentSide": "right",
                        "segmentIndex": crossing["right_segment_index"],
                    },
                }
            )

    return {
        "type": "FeatureCollection",
        "features": features,
    }


def build_debug_html(payload: dict, debug_geojson: dict) -> str:
    summary = validation_summary(payload)
    title = "Bakki Geometry Debug Viewer"
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <style>
      :root {{
        color-scheme: light;
        --bg: #f4f1e8;
        --paper: #fffdf7;
        --ink: #1e241d;
        --muted: #5c6657;
        --line: #d4ccb7;
        --ranch: #264653;
        --zone: rgba(42, 157, 143, 0.18);
        --zone-line: #2a9d8f;
        --fail: #c44536;
        --warn: #d98e04;
      }}

      * {{
        box-sizing: border-box;
      }}

      body {{
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        background: linear-gradient(180deg, #efe8d6 0%, var(--bg) 100%);
        color: var(--ink);
      }}

      .page {{
        max-width: 1440px;
        margin: 0 auto;
        padding: 32px;
      }}

      .header {{
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 24px;
      }}

      .header h1 {{
        margin: 0 0 8px;
        font-size: 32px;
        line-height: 1.1;
      }}

      .header p {{
        margin: 0;
        max-width: 760px;
        color: var(--muted);
      }}

      .layout {{
        display: grid;
        grid-template-columns: minmax(320px, 1fr) minmax(360px, 520px);
        gap: 24px;
      }}

      .panel {{
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 24px;
        box-shadow: 0 18px 42px rgba(33, 38, 30, 0.08);
      }}

      .map-panel {{
        padding: 16px;
      }}

      .sidebar {{
        padding: 20px;
      }}

      .sidebar h2,
      .map-panel h2 {{
        margin: 0 0 12px;
        font-size: 18px;
      }}

      .meta-grid {{
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 20px;
      }}

      .meta-card {{
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: #fcfaf4;
      }}

      .meta-card span {{
        display: block;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 4px;
      }}

      .meta-card strong {{
        font-size: 18px;
      }}

      .legend {{
        display: flex;
        flex-wrap: wrap;
        gap: 10px 16px;
        margin-bottom: 16px;
        font-size: 13px;
        color: var(--muted);
      }}

      .legend-item {{
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }}

      .legend-swatch {{
        width: 14px;
        height: 14px;
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.14);
      }}

      .legend-ranch {{ background: rgba(38, 70, 83, 0.15); }}
      .legend-zone {{ background: rgba(42, 157, 143, 0.18); }}
      .legend-fail {{ background: var(--fail); }}
      .legend-overlap {{ background: var(--warn); }}

      svg {{
        display: block;
        width: 100%;
        height: auto;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: linear-gradient(180deg, #fbf8ef 0%, #f2ecdc 100%);
      }}

      .section + .section {{
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid var(--line);
      }}

      .section h3 {{
        margin: 0 0 12px;
        font-size: 16px;
      }}

      .issue-list {{
        margin: 0;
        padding-left: 18px;
      }}

      .issue-list li + li {{
        margin-top: 10px;
      }}

      code {{
        font-family: "SFMono-Regular", Menlo, Consolas, monospace;
        font-size: 12px;
      }}

      .empty {{
        color: var(--muted);
        font-style: italic;
      }}

      @media (max-width: 1080px) {{
        .layout {{
          grid-template-columns: 1fr;
        }}
      }}
    </style>
  </head>
  <body>
    <div class="page">
      <header class="header">
        <div>
          <h1>{title}</h1>
          <p>
            Visualizes the current ranch and zone topology failures from <code>geometry-seed.json</code>.
            Red points mark vertices outside the ranch boundary. Orange lines mark strictly crossing
            overlap segments between neighboring zones.
          </p>
        </div>
      </header>

      <div class="layout">
        <section class="panel map-panel">
          <h2>Topology Map</h2>
          <div class="legend">
            <span class="legend-item"><span class="legend-swatch legend-ranch"></span> Ranch boundary</span>
            <span class="legend-item"><span class="legend-swatch legend-zone"></span> Zone boundary</span>
            <span class="legend-item"><span class="legend-swatch legend-fail"></span> Containment-failure vertex</span>
            <span class="legend-item"><span class="legend-swatch legend-overlap"></span> Overlap segment</span>
          </div>
          <svg id="debug-map" viewBox="0 0 1200 900" aria-label="Bakki geometry debug map"></svg>
        </section>

        <aside class="panel sidebar">
          <div class="meta-grid">
            <div class="meta-card">
              <span>Generated</span>
              <strong>{summary["generated_at"]}</strong>
            </div>
            <div class="meta-card">
              <span>Valid</span>
              <strong>{"Yes" if summary["valid"] else "No"}</strong>
            </div>
            <div class="meta-card">
              <span>Containment Failures</span>
              <strong>{len(summary["containment_failures"])}</strong>
            </div>
            <div class="meta-card">
              <span>Overlap Pairs</span>
              <strong>{len(summary["zone_overlap_pairs"])}</strong>
            </div>
          </div>

          <section class="section">
            <h3>Containment Failures</h3>
            <ul class="issue-list">
              {"".join(
                f"<li><strong>{entry['zone']}</strong>: {entry['outside_vertex_count']} vertex failure(s)</li>"
                for entry in summary["containment_failure_details"]
              ) or '<li class="empty">None</li>'}
            </ul>
          </section>

          <section class="section">
            <h3>Overlap Pairs</h3>
            <ul class="issue-list">
              {"".join(
                f"<li><strong>{left}</strong> / <strong>{right}</strong></li>"
                for left, right in summary["zone_overlap_pairs"]
              ) or '<li class="empty">None</li>'}
            </ul>
          </section>

          <section class="section">
            <h3>Commands</h3>
            <ul class="issue-list">
              <li><code>yarn seed:geometry:inspect</code></li>
              <li><code>yarn seed:geometry:validate</code></li>
              <li><code>yarn seed:geometry:debug</code></li>
            </ul>
          </section>
        </aside>
      </div>
    </div>

    <script>
      const geojson = {json.dumps(debug_geojson)};
      const svg = document.getElementById('debug-map');
      const width = 1200;
      const height = 900;
      const padding = 56;

      const coordinates = [];

      function collectCoords(geometry) {{
        if (!geometry) return;
        if (geometry.type === 'Point') {{
          coordinates.push(geometry.coordinates);
          return;
        }}
        if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {{
          geometry.coordinates.forEach((coord) => coordinates.push(coord));
          return;
        }}
        if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {{
          geometry.coordinates.flat().forEach((coord) => coordinates.push(coord));
          return;
        }}
        if (geometry.type === 'MultiPolygon') {{
          geometry.coordinates.flat(2).forEach((coord) => coordinates.push(coord));
        }}
      }}

      geojson.features.forEach((feature) => collectCoords(feature.geometry));

      const longitudes = coordinates.map((coord) => coord[0]);
      const latitudes = coordinates.map((coord) => coord[1]);
      const minLon = Math.min(...longitudes);
      const maxLon = Math.max(...longitudes);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const spanLon = Math.max(maxLon - minLon, 1e-9);
      const spanLat = Math.max(maxLat - minLat, 1e-9);
      const scale = Math.min((width - padding * 2) / spanLon, (height - padding * 2) / spanLat);

      function project(coord) {{
        const x = padding + (coord[0] - minLon) * scale;
        const y = height - padding - (coord[1] - minLat) * scale;
        return [x, y];
      }}

      function polygonPath(coords) {{
        return coords[0].map((coord, index) => {{
          const [x, y] = project(coord);
          return `${{index === 0 ? 'M' : 'L'}}${{x.toFixed(2)}},${{y.toFixed(2)}}`;
        }}).join(' ') + ' Z';
      }}

      function linePath(coords) {{
        return coords.map((coord, index) => {{
          const [x, y] = project(coord);
          return `${{index === 0 ? 'M' : 'L'}}${{x.toFixed(2)}},${{y.toFixed(2)}}`;
        }}).join(' ');
      }}

      function appendElement(name, attributes, text) {{
        const node = document.createElementNS('http://www.w3.org/2000/svg', name);
        Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
        if (text) {{
          node.textContent = text;
        }}
        svg.appendChild(node);
        return node;
      }}

      for (const feature of geojson.features) {{
        const role = feature.properties?.featureRole;
        if (feature.geometry?.type === 'Polygon' && role === 'ranch_boundary') {{
          appendElement('path', {{
            d: polygonPath(feature.geometry.coordinates),
            fill: 'rgba(38, 70, 83, 0.10)',
            stroke: '#264653',
            'stroke-width': 3,
          }});
        }}
      }}

      for (const feature of geojson.features) {{
        const role = feature.properties?.featureRole;
        if (feature.geometry?.type === 'Polygon' && role === 'zone_boundary') {{
          appendElement('path', {{
            d: polygonPath(feature.geometry.coordinates),
            fill: 'rgba(42, 157, 143, 0.18)',
            stroke: '#2a9d8f',
            'stroke-width': 2.5,
          }});
          const coords = feature.geometry.coordinates[0];
          const centroid = coords.slice(0, -1).reduce((acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]], [0, 0]).map((value) => value / Math.max(coords.length - 1, 1));
          const [x, y] = project(centroid);
          appendElement('text', {{
            x,
            y,
            'text-anchor': 'middle',
            'font-size': 18,
            'font-weight': 700,
            fill: '#1f4037',
          }}, feature.properties.zoneName);
        }}
      }}

      for (const feature of geojson.features) {{
        const role = feature.properties?.featureRole;
        if (feature.geometry?.type === 'LineString' && role === 'overlap_segment') {{
          appendElement('path', {{
            d: linePath(feature.geometry.coordinates),
            fill: 'none',
            stroke: '#d98e04',
            'stroke-width': 5,
            'stroke-linecap': 'round',
            opacity: 0.9,
          }});
        }}
      }}

      for (const feature of geojson.features) {{
        const role = feature.properties?.featureRole;
        if (feature.geometry?.type === 'Point' && role === 'containment_failure_vertex') {{
          const [x, y] = project(feature.geometry.coordinates);
          appendElement('circle', {{
            cx: x,
            cy: y,
            r: 7,
            fill: '#c44536',
            stroke: '#fff8ef',
            'stroke-width': 2,
          }});
        }}
      }}
    </script>
  </body>
</html>
"""


def main() -> None:
    args = parse_args()
    payload = build_seed_payload(args)
    summary = validation_summary(payload)

    if args.debug_out:
        debug_output_path = Path(args.debug_out)
        debug_output_path.parent.mkdir(parents=True, exist_ok=True)
        debug_geojson = build_debug_geojson(payload)
        debug_output_path.write_text(json.dumps(debug_geojson, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote geometry debug GeoJSON to {debug_output_path}")
    else:
        debug_geojson = build_debug_geojson(payload)

    if args.debug_html_out:
        debug_html_output_path = Path(args.debug_html_out)
        debug_html_output_path.parent.mkdir(parents=True, exist_ok=True)
        debug_html_output_path.write_text(build_debug_html(payload, debug_geojson), encoding="utf-8")
        print(f"Wrote geometry debug HTML to {debug_html_output_path}")

    if args.summary_only:
        print(json.dumps(summary, indent=2))
    else:
        output_path = Path(args.out)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote geometry seed to {output_path}")
        print(json.dumps(summary, indent=2))

    if args.check and not summary["valid"]:
        raise SystemExit(
            "Geometry seed validation failed. Review containment_failures and zone_overlap_pairs.",
        )


if __name__ == "__main__":
    main()
