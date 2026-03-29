import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const SCRIPT_PATH = join(process.cwd(), 'scripts', 'build_geometry_seed.py');

function runSeedTool(args) {
  const result = spawnSync('python3', [SCRIPT_PATH, ...args], {
    cwd: process.cwd(),
    encoding: 'utf-8',
  });

  return {
    ...result,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function parseSummaryFromStdout(stdout) {
  return JSON.parse(
    stdout
      .split('\n')
      .filter((line) => line && !line.startsWith('Wrote geometry debug '))
      .join('\n'),
  );
}

test('geometry seed summary is currently valid', () => {
  const result = runSeedTool(['--summary-only']);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const summary = parseSummaryFromStdout(result.stdout);

  assert.equal(summary.valid, true);
  assert.equal(summary.zones_within_ranch, true);
  assert.deepEqual(summary.containment_failures, []);
  assert.deepEqual(summary.zone_overlap_pairs, []);
});

test('geometry seed check mode succeeds with the current ranch and zone KML', () => {
  const result = runSeedTool(['--summary-only', '--check']);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const summary = parseSummaryFromStdout(result.stdout);
  assert.equal(summary.valid, true);
});

test('geometry seed debug outputs are generated and contain the expected top-level structures', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'bakki-geometry-seed-'));

  try {
    const debugGeoJsonPath = join(tempDir, 'geometry-debug.geojson');
    const debugHtmlPath = join(tempDir, 'geometry-debug.html');
    const result = runSeedTool([
      '--summary-only',
      '--debug-out',
      debugGeoJsonPath,
      '--debug-html-out',
      debugHtmlPath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const geojson = JSON.parse(readFileSync(debugGeoJsonPath, 'utf-8'));
    const html = readFileSync(debugHtmlPath, 'utf-8');

    assert.equal(geojson.type, 'FeatureCollection');
    assert.equal(geojson.features.length, 6);
    assert.ok(geojson.features.some((feature) => feature.properties?.featureRole === 'ranch_boundary'));
    assert.equal(
      geojson.features.filter((feature) => feature.properties?.featureRole === 'zone_boundary').length,
      5,
    );

    assert.match(html, /Bakki Geometry Debug Viewer/);
    assert.match(html, /const geojson = /);
    assert.match(html, /Topology Map/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('geometry seed check mode fails for invalid custom KML and emits debug failure features', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'bakki-geometry-seed-invalid-'));

  try {
    const ranchKmlPath = join(tempDir, 'ranch.kml');
    const zonesKmlPath = join(tempDir, 'zones.kml');
    const debugGeoJsonPath = join(tempDir, 'geometry-debug.geojson');

    writeFileSync(
      ranchKmlPath,
      `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Ranch</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              0,0,0 10,0,0 10,10,0 0,10,0 0,0,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>\n`,
      'utf-8',
    );

    writeFileSync(
      zonesKmlPath,
      `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Zone 1</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              1,1,0 5,1,0 5,5,0 1,5,0 1,1,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
    <Placemark>
      <name>Zone 2</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              4,4,0 11,4,0 11,8,0 4,8,0 4,4,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>\n`,
      'utf-8',
    );

    const result = runSeedTool([
      '--ranch-kml',
      ranchKmlPath,
      '--zones-kml',
      zonesKmlPath,
      '--summary-only',
      '--check',
      '--debug-out',
      debugGeoJsonPath,
    ]);

    assert.equal(result.status, 1);

    const summary = parseSummaryFromStdout(result.stdout);
    const geojson = JSON.parse(readFileSync(debugGeoJsonPath, 'utf-8'));

    assert.equal(summary.valid, false);
    assert.deepEqual(summary.containment_failures, ['Zone 2']);
    assert.deepEqual(summary.zone_overlap_pairs, [['Zone 1', 'Zone 2']]);
    assert.match(result.stderr, /Geometry seed validation failed/);

    assert.ok(geojson.features.some((feature) => feature.properties?.featureRole === 'containment_failure_vertex'));
    assert.ok(geojson.features.some((feature) => feature.properties?.featureRole === 'overlap_segment'));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
