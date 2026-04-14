import * as Astronomy from 'astronomy-engine';
const { AstroTime, SunPosition, EclipticGeoMoon, EclipticLongitude, Body, SiderealTime } =
  Astronomy;

// Birth: 1996-04-10, Каменец, Беларусь (52.40N, 23.81E)
const utcDate = new Date(Date.UTC(1996, 3, 10, 12, 0));
const time = new AstroTime(utcDate);

const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];
const sign = (lon) => SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)];
const deg = (lon) => {
  const inSign = (((lon % 360) + 360) % 360) % 30;
  const d = Math.floor(inSign);
  const m = Math.round((inSign - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}'`;
};

const planets = {
  sun: SunPosition(time).elon,
  moon: EclipticGeoMoon(time).lon,
  mercury: EclipticLongitude(Body.Mercury, time),
  venus: EclipticLongitude(Body.Venus, time),
  mars: EclipticLongitude(Body.Mars, time),
  jupiter: EclipticLongitude(Body.Jupiter, time),
  saturn: EclipticLongitude(Body.Saturn, time),
  uranus: EclipticLongitude(Body.Uranus, time),
  neptune: EclipticLongitude(Body.Neptune, time),
  pluto: EclipticLongitude(Body.Pluto, time),
};

console.log('=== Planetary ecliptic longitudes (noon UTC) ===');
for (const [name, lon] of Object.entries(planets)) {
  console.log(
    `${name.padEnd(10)} ${lon.toFixed(2).padStart(7)}°  ${sign(lon).padEnd(12)} ${deg(lon)}`,
  );
}

// ASC/MC for lat 52.40, lon 23.81
const gmst = SiderealTime(time);
const lstDeg = (gmst + 23.81 / 15) * 15;
const oblDeg = 23.4393;
const oblRad = (oblDeg * Math.PI) / 180;
const latRad = (52.4 * Math.PI) / 180;
const lstRad = (lstDeg * Math.PI) / 180;
let asc =
  (Math.atan2(
    -Math.cos(lstRad),
    Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(lstRad),
  ) *
    180) /
  Math.PI;
if (asc < 0) asc += 360;
let mc = (Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(oblRad)) * 180) / Math.PI;
if (mc < 0) mc += 360;

console.log(`\nASC:       ${asc.toFixed(2).padStart(7)}°  ${sign(asc).padEnd(12)} ${deg(asc)}`);
console.log(`MC:        ${mc.toFixed(2).padStart(7)}°  ${sign(mc).padEnd(12)} ${deg(mc)}`);

// House assignments (equal houses from ASC)
console.log('\n=== House assignments (Equal House from ASC) ===');
for (const [name, lon] of Object.entries(planets)) {
  const h = Math.floor(((lon - asc + 360) % 360) / 30) + 1;
  console.log(`${name.padEnd(10)} House ${h}`);
}

// Expected from screenshot:
console.log('\n=== Expected from screenshot ===');
console.log('Sun:     Pisces 28°34  House 1');
console.log('Moon:    Pisces 29°56  House 2');
console.log('Mercury: Aries 1°19   House 3');
console.log('Venus:   Taurus 2°41  House 4');
console.log('Mars:    Taurus 4°03  House 5');
console.log('Jupiter: Gemini 5°25  House 6');
console.log('Saturn:  Gemini 6°47  House 7');
console.log('Uranus:  Cancer 8°10  House 8');
console.log('Neptune: Cancer 9°32  House 9');
console.log('Pluto:   Leo 10°54   House 10');
console.log('ASC:     Leo 12°16');
console.log('MC:      Virgo 13°38');
