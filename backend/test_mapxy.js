// Test: does old mapXYToLatLon correctly invert the NEW mapX/mapY formula?

function mapXYToLatLon(mapX, mapY) {
  const lon = (mapX / 7.5) * 180;
  const theta = (0.5 - mapY / 7.5) * Math.PI;
  const lat = 90 - (theta * 180) / Math.PI;
  return [lat, lon];
}

// Backend NEW formula:
//   mapX = (geo.lon / 180) * 7.5
//   mapY = (geo.lat / 90) * 3.75

const tests = [[0,0], [45, 90], [51.6, 143], [-30, -120], [89, -179], [-51.6, -45]];

for (const [testLat, testLon] of tests) {
  const mx = (testLon / 180) * 7.5;
  const my = (testLat / 90) * 3.75;
  const [rLat, rLon] = mapXYToLatLon(mx, my);
  const ok = Math.abs(rLat - testLat) < 0.1 && Math.abs(rLon - testLon) < 0.1;
  console.log(`(${testLat}, ${testLon}) -> mapXY(${mx.toFixed(3)}, ${my.toFixed(3)}) -> latlon(${rLat.toFixed(2)}, ${rLon.toFixed(2)}) ${ok ? 'OK' : 'WRONG'}`);
}
