import type { FlightPlan, LatLngTuple } from "../types/aviation";

const FIN_PLANNED: LatLngTuple[] = [
  [60.3172, 24.9633],
  [61.15, 25.2],
  [62.25, 25.4],
  [63.15, 25.48],
  [64.2, 25.42],
  [64.9301, 25.3546],
];

const FIN_BYPASS: LatLngTuple[] = [
  [60.3172, 24.9633],
  [61.05, 24.55],
  [61.75, 23.4],
  [62.7, 23.2],
  [63.75, 23.85],
  [64.45, 24.7],
  [64.9301, 25.3546],
];

const FIN_SIGMET: LatLngTuple[] = [
  [61.9, 24.5],
  [61.9, 26.4],
  [63.6, 26.5],
  [63.6, 24.35],
];

const DLH_PLANNED: LatLngTuple[] = [
  [50.0379, 8.5622],
  [49.72, 10.3],
  [49.25, 12.2],
  [48.85, 14.1],
  [48.4, 15.55],
  [48.1103, 16.5697],
];

const DLH_BYPASS: LatLngTuple[] = [
  [50.0379, 8.5622],
  [50.2, 10.4],
  [50.45, 12.5],
  [50.25, 14.4],
  [49.55, 15.7],
  [48.8, 16.2],
  [48.1103, 16.5697],
];

const DLH_SIGMET: LatLngTuple[] = [
  [49.6, 11.3],
  [49.6, 15.05],
  [48.4, 15.15],
  [48.4, 11.4],
];

const BAW_PLANNED: LatLngTuple[] = [
  [51.47, -0.4543],
  [52.2, -8],
  [53.1, -15],
  [53.4, -25],
  [51.8, -35],
  [49.2, -45],
  [46.4, -55],
  [43.2, -65],
  [41.4, -71.5],
  [40.6413, -73.7781],
];

const BAW_BYPASS: LatLngTuple[] = [
  [51.47, -0.4543],
  [54, -8],
  [56.5, -18],
  [58.2, -30],
  [57.4, -42],
  [54.5, -52],
  [50, -60],
  [45.5, -68],
  [42.2, -72.2],
  [40.6413, -73.7781],
];

const BAW_SIGMET: LatLngTuple[] = [
  [52.4, -48],
  [52.4, -32],
  [47.2, -32],
  [47.2, -48],
];

const DAL_PLANNED: LatLngTuple[] = [
  [33.6407, -84.4277],
  [35.3, -85.4],
  [36.9, -86.3],
  [38.5, -87],
  [40.3, -87.55],
  [41.9742, -87.9073],
];

const DAL_BYPASS: LatLngTuple[] = [
  [33.6407, -84.4277],
  [35.1, -84.1],
  [36.7, -83.9],
  [38.3, -84.5],
  [39.7, -85.7],
  [41.1, -87.1],
  [41.9742, -87.9073],
];

const DAL_SIGMET: LatLngTuple[] = [
  [36.15, -87.85],
  [36.15, -85.45],
  [39.15, -85.5],
  [39.15, -87.9],
];

export const FLIGHTS: FlightPlan[] = [
  {
    id: "FIN312",
    callsign: "FIN312",
    icao24: "461f12",
    aircraft: "A321",
    airline: "Finnair",
    fuelFlowKgH: 2600,
    cruiseFl: 340,
    departureIcao: "EFHK",
    arrivalIcao: "EFOU",
    alternateIcaos: ["EFRO", "EFTP"],
    planned: FIN_PLANNED,
    bypass: FIN_BYPASS,
    diversion: {
      EFRO: [
        [60.3172, 24.9633],
        [61.7, 25.25],
        [63.1, 25.55],
        [64.7, 25.65],
        [65.8, 25.75],
        [66.5648, 25.8304],
      ],
      EFTP: [
        [60.3172, 24.9633],
        [60.9, 24.3],
        [61.4141, 23.6044],
      ],
    },
    diversionAvoid: {
      EFRO: [
        [60.3172, 24.9633],
        [61.15, 24.4],
        [62.3, 23.15],
        [63.9, 23.6],
        [65.1, 24.7],
        [66.1, 25.4],
        [66.5648, 25.8304],
      ],
      EFTP: [
        [60.3172, 24.9633],
        [60.85, 24.1],
        [61.4141, 23.6044],
      ],
    },
    sigmet: FIN_SIGMET,
    sigmetName: "SIGMET BRAVO — CLEAR-AIR TURBULENCE",
  },
  {
    id: "DLH456",
    callsign: "DLH456",
    icao24: "3c4a21",
    aircraft: "A320",
    airline: "Lufthansa",
    fuelFlowKgH: 2400,
    cruiseFl: 340,
    departureIcao: "EDDF",
    arrivalIcao: "LOWW",
    alternateIcaos: ["LKPR", "LZIB"],
    planned: DLH_PLANNED,
    bypass: DLH_BYPASS,
    diversion: {
      LKPR: [
        [50.0379, 8.5622],
        [50.12, 10.6],
        [50.2, 12.4],
        [50.1008, 14.26],
      ],
      LZIB: [
        [50.0379, 8.5622],
        [49.5, 11],
        [48.9, 13.8],
        [48.5, 15.6],
        [48.1702, 17.2127],
      ],
    },
    diversionAvoid: {
      LKPR: [
        [50.0379, 8.5622],
        [50.25, 10.8],
        [50.35, 12.6],
        [50.1008, 14.26],
      ],
      LZIB: [
        [50.0379, 8.5622],
        [50.3, 11],
        [50.4, 14],
        [49.7, 16],
        [48.9, 16.8],
        [48.1702, 17.2127],
      ],
    },
    sigmet: DLH_SIGMET,
    sigmetName: "SIGMET CHARLIE — CAT / MOUNTAIN WAVE",
  },
  {
    id: "BAW117",
    callsign: "BAW117",
    icao24: "400c77",
    aircraft: "B777-300ER",
    airline: "British Airways",
    fuelFlowKgH: 6900,
    cruiseFl: 340,
    departureIcao: "EGLL",
    arrivalIcao: "KJFK",
    alternateIcaos: ["KBOS", "KEWR"],
    planned: BAW_PLANNED,
    bypass: BAW_BYPASS,
    diversion: {
      KBOS: [
        [51.47, -0.4543],
        [53.2, -12],
        [54.2, -28],
        [51.5, -42],
        [47.2, -55],
        [44.2, -64],
        [42.3656, -71.0096],
      ],
      KEWR: [
        [51.47, -0.4543],
        [52.6, -12],
        [53.2, -28],
        [50.2, -42],
        [46, -56],
        [42.4, -66],
        [40.6895, -74.1745],
      ],
    },
    diversionAvoid: {
      KBOS: [
        [51.47, -0.4543],
        [54.2, -10],
        [56.8, -24],
        [57.2, -40],
        [54.8, -54],
        [49.5, -64],
        [44.8, -69],
        [42.3656, -71.0096],
      ],
      KEWR: [
        [51.47, -0.4543],
        [54, -12],
        [56.4, -26],
        [56.6, -42],
        [53.5, -55],
        [48, -64],
        [43.5, -70],
        [40.6895, -74.1745],
      ],
    },
    sigmet: BAW_SIGMET,
    sigmetName: "SIGMET DELTA — NORTH ATLANTIC CAT",
  },
  {
    id: "DAL204",
    callsign: "DAL204",
    icao24: "a2b904",
    aircraft: "B737-900",
    airline: "Delta",
    fuelFlowKgH: 2400,
    cruiseFl: 340,
    departureIcao: "KATL",
    arrivalIcao: "KORD",
    alternateIcaos: ["KIND", "KMDW"],
    planned: DAL_PLANNED,
    bypass: DAL_BYPASS,
    diversion: {
      KIND: [
        [33.6407, -84.4277],
        [35.6, -85],
        [37.4, -85.6],
        [38.8, -86],
        [39.7173, -86.2944],
      ],
      KMDW: [
        [33.6407, -84.4277],
        [35.4, -85.5],
        [37.2, -86.4],
        [39.2, -87.1],
        [40.8, -87.5],
        [41.7868, -87.7522],
      ],
    },
    diversionAvoid: {
      KIND: [
        [33.6407, -84.4277],
        [35.4, -84],
        [37.1, -84.3],
        [38.6, -84.9],
        [39.4, -85.6],
        [39.7173, -86.2944],
      ],
      KMDW: [
        [33.6407, -84.4277],
        [35.2, -83.8],
        [37.4, -84.2],
        [39.4, -85.2],
        [40.8, -86.6],
        [41.7868, -87.7522],
      ],
    },
    sigmet: DAL_SIGMET,
    sigmetName: "SIGMET ECHO — CONVECTIVE TURBULENCE",
  },
];

export function flightById(id: string): FlightPlan {
  const flight = FLIGHTS.find((item) => item.id === id);
  if (!flight) throw new Error(`Unknown flight ${id}`);
  return flight;
}
