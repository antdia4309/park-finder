# ParkFinder

ParkFinder helps you find the right park in the Richmond, Virginia area for what you want to do: a playground for the kids, a dog park, a long walk, a picnic, or a pickup game.

Pick one or more activities and the app ranks parks by how well they fit, shows them on the map, and explains why each one matched. Select a park to see what's there and get directions.

Live site: https://antdia4309.github.io/park-finder

This started as ParkingFinder, a parking reservation app built for a class final project, and was rebuilt around finding parks by activity.

## Features

- Activity filters for kids, dogs, walking, water, accessibility, picnics, and sports, which can be combined
- Nearby parks grouped into numbered clusters when zoomed out
- Save favorite parks (stored in your browser, no account needed)
- "Open now" badges for parks with posted hours
- Park photos from Wikimedia Commons, with author and license credit
- A weather tip from Open-Meteo on hot days or after heavy rain
- A match score for each park based on what's mapped there (playgrounds, dog parks, path mileage, picnic tables, fields, restrooms, water fountains)
- An interactive Leaflet map with markers colored by each park's best activity
- Sorting by distance from your current location
- A park details panel with amenities, hours, and directions
- The selected park's real boundary drawn on the map
- Shareable links: filters and the selected park live in the URL, like `?do=kids,picnic&park=byrd-park`
- A chart of which amenities are common across the matching parks

## Data

Park data comes from [OpenStreetMap](https://www.openstreetmap.org). A GitHub Action refreshes it every Monday night: it downloads [Geofabrik's](https://download.geofabrik.de/north-america/us/virginia.html) daily OpenStreetMap file for Virginia, cuts out the Richmond area with [osmium](https://osmcode.org/osmium-tool/), and builds `public/data/parks.json`. It also looks up park photos through each park's Wikidata link. The app downloads that file when it starts, separately from its code, so it never depends on an outside API and a data refresh doesn't change the app's code files. You can also trigger a refresh from the **Actions** tab with **Run workflow**.

To refresh the data yourself (in a Codespace or on Linux):

```bash
sudo apt-get install -y osmium-tool   # one time
npm run fetch-parks
```

If a park's information looks wrong, the "Fix this park's info" link opens it on OpenStreetMap, where anyone can edit it. Fixes show up in ParkFinder after the next weekly refresh.

## Setup

Built with [Vite](https://vite.dev) and tested with [Vitest](https://vitest.dev).

```bash
npm install
npm start           # dev server at http://localhost:5173/park-finder/
npm test            # run the tests once
npm run test:watch  # rerun tests as you edit
npm run lint        # check the code for mistakes
npm run build       # production build in build/
npm run preview     # serve the production build locally
```

## Deploying

Every push to `main` checks the code, runs the tests, and publishes the site to GitHub Pages through GitHub Actions (`.github/workflows/deploy.yml`). There's no manual deploy step. In the repo's **Settings → Pages**, the source must be set to **GitHub Actions**.

## How matching works

Each activity has a score from 0 to 1. For example, a park with a playground scores well for kids, and a little higher if it also has restrooms and water. Walking scores rise with path mileage, up to 3 miles. When you pick several activities, a park has to support all of them, and its match is the average of those scores.

## License

The code is released under the [MIT License](LICENSE).

Park data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, available under the Open Database License. Park photos come from [Wikimedia Commons](https://commons.wikimedia.org), and each one is credited with its author and license in the app. Map tiles © Esri. Fonts are [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) and [Bricolage Grotesque](https://github.com/ateliertriay/bricolage), both under the SIL Open Font License, bundled through [Fontsource](https://fontsource.org).
