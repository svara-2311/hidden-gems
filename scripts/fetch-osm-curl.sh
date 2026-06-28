#!/bin/bash

# Fetch coffee shops from OpenStreetMap using curl + Overpass API
# Creates a JSON file that can be imported into the database

OUTPUT_FILE="osm-cafes.json"
OVERPASS_URL="https://overpass-api.de/api/interpreter"

echo "☕ Fetching Bay Area coffee shops from OpenStreetMap..."
echo "⏳ This may take a few minutes..."

# Create a single query for all 11 cities combined
QUERY='
[bbox:37.206,-122.522,37.906,-121.792];
[out:json];
(
  node["amenity"~"cafe|coffee_shop"]["name"];
  way["amenity"~"cafe|coffee_shop"]["name"];
  node["amenity"="cafe"]["name"];
  way["amenity"="cafe"]["name"];
  node["amenity"="coffee_shop"]["name"];
  way["amenity"="coffee_shop"]["name"];
);
out center geom;
'

echo "Sending request to Overpass API..."

# Use curl with proper headers
curl -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "data=$QUERY" \
  "$OVERPASS_URL" > "$OUTPUT_FILE"

# Check if we got results
RESULT_COUNT=$(jq '.elements | length' "$OUTPUT_FILE" 2>/dev/null || echo "0")

if [ "$RESULT_COUNT" -gt "0" ]; then
  echo "✅ Successfully fetched $RESULT_COUNT places from OSM!"
  echo "📁 Results saved to: $OUTPUT_FILE"
else
  echo "⚠️  Failed to fetch data from Overpass"
  echo "Trying alternative Overpass instance..."

  curl -s -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "data=$QUERY" \
    "https://overpass.kumi.systems/api/interpreter" > "$OUTPUT_FILE"

  RESULT_COUNT=$(jq '.elements | length' "$OUTPUT_FILE" 2>/dev/null || echo "0")

  if [ "$RESULT_COUNT" -gt "0" ]; then
    echo "✅ Successfully fetched $RESULT_COUNT places!"
  else
    echo "❌ Failed on all Overpass instances"
  fi
fi
