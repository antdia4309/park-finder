# ParkFinder

ParkFinder helps you find the right park in the Richmond, Virginia area for what you want to do: a playground for the kids, a dog park, a long walk, a picnic, or a pickup game.

Pick one or more activities and the app ranks parks by how well they fit, shows them on the map, and explains why each one matched. Select a park to see what's there and get directions.

Live site: https://antdia4309.github.io/park-finder

This started as ParkingFinder, a parking reservation app built for a class final project, and was rebuilt around finding parks by activity.

## Features

- Activity filters for kids, dogs, walking, picnics, and sports, which can be combined
- A match score for each park based on what's mapped there (playgrounds, dog parks, path mileage, picnic tables, fields, restrooms, water fountains)
- An interactive Leaflet map with markers colored by each park's best activity
- Sorting by distance from your current location
- A park details panel with amenities, hours, and directions
- A chart of which amenities are common across the matching parks

## Data

Park data comes from [OpenStreetMap](https://www.openstreetmap.org) through the Overpass API. To keep the app fast and reliable, the data is fetched ahead of time and saved to `src/data/parks.json`, so the live site makes no API calls.

To refresh the data for the full Richmond metro area:

```bash
npm run fetch-parks
```

The public Overpass servers are sometimes busy. If the script fails, wait a few minutes and run it again. You can also rebuild from a saved Overpass response with `npm run fetch-parks -- --from raw.json`.

If a park's information looks wrong, the "Fix this park's info" link opens it on OpenStreetMap, where anyone can edit it. Fixes show up in ParkFinder the next time the data is refreshed.

## Setup

```bash
npm install
npm start        # runs at http://localhost:3000
npm test
npm run build
npm run deploy   # publishes to GitHub Pages
```

## How matching works

Each activity has a score from 0 to 1. For example, a park with a playground scores well for kids, and a little higher if it also has restrooms and water. Walking scores rise with path mileage, up to 3 miles. When you pick several activities, a park has to support all of them, and its match is the average of those scores.
