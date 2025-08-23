// Run this in Node.js to add coordinates to your travel data
const fs = require("fs");

const coordinates = {
  "North Augusta, SC": { lat: 33.5018, lon: -82.0207 },
  "Greenville, SC": { lat: 34.8526, lon: -82.394 },
  "New Orleans, LA": { lat: 29.9511, lon: -90.0715 },
  "Allen, TX": { lat: 33.1031, lon: -96.6706 },
  // ... add all your locations here
};

const travelData = JSON.parse(
  fs.readFileSync("app/data/travel-data.json", "utf8")
);

const updatedData = travelData.map((trip) => {
  const coords = coordinates[trip.location];
  return coords ? { ...trip, coordinates: coords } : trip;
});

fs.writeFileSync(
  "app/data/travel-data.json",
  JSON.stringify(updatedData, null, 2)
);
console.log("Coordinates added to travel data!");
