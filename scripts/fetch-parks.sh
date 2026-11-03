#!/usr/bin/env bash
# Downloads the latest OpenStreetMap data for Virginia from Geofabrik,
# cuts out the Richmond area, and builds src/data/parks.json.
#
# Needs osmium. In a Codespace: sudo apt-get install -y osmium-tool
# Run with: npm run fetch-parks
set -euo pipefail

# Richmond metro area: west,south,east,north
BBOX="-77.62,37.43,-77.33,37.66"
SOURCE="https://download.geofabrik.de/north-america/us/virginia-latest.osm.pbf"
WORK=".osm-cache"

if ! command -v osmium > /dev/null; then
  echo "osmium is not installed. Run: sudo apt-get install -y osmium-tool" >&2
  exit 1
fi

mkdir -p "$WORK"

# Reuse a download from the last 24 hours so reruns are quick.
if [ -n "$(find "$WORK/virginia.osm.pbf" -mmin -1440 2>/dev/null)" ]; then
  echo "Using Virginia map data downloaded in the last day."
else
  echo "Downloading Virginia map data (about 430 MB)..."
  curl -fsSL --retry 3 --retry-delay 10 -o "$WORK/virginia.osm.pbf" "$SOURCE"
fi

echo "Keeping only park-related features..."
osmium tags-filter "$WORK/virginia.osm.pbf" \
  nwr/leisure=park,dog_park,nature_reserve,playground,pitch,picnic_table,picnic_site,fitness_station \
  nwr/leisure=swimming_pool,swimming_area,splash_pad,fishing,slipway \
  nwr/playground=splash_pad nwr/canoe=put_in nwr/whitewater=put_in \
  nwr/amenity=toilets,drinking_water,bbq,shelter nwr/tourism=picnic_site \
  w/highway=footway,path,track,cycleway,pedestrian,bridleway \
  -o "$WORK/filtered.osm.pbf" --overwrite

echo "Cutting out the Richmond area..."
osmium extract -s smart -b "$BBOX" "$WORK/filtered.osm.pbf" -o "$WORK/richmond.osm.pbf" --overwrite

echo "Converting to GeoJSON..."
osmium export "$WORK/richmond.osm.pbf" -f geojsonseq --add-unique-id=type_id \
  -o "$WORK/richmond.geojsonseq" --overwrite

node scripts/build-parks.mjs "$WORK/richmond.geojsonseq"
