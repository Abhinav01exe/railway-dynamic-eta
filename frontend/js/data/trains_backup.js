/**
 * Authentic Indian Railways Train Schedules & Route Telemetry Data
 */

(function() {
  window.RailwayETA = window.RailwayETA || {};

  window.RailwayETA.TRAINS_DATABASE = [
    {
      id: "12302",
      number: "12302",
      name: "Howrah Rajdhani Express",
      type: "Rajdhani Express (Superfast)",
      origin: "NDLS",
      originName: "New Delhi",
      destination: "HWH",
      destinationName: "Howrah Junction",
      totalDistanceKm: 1451,
      avgSpeedKmh: 85,
      maxPermissibleSpeedKmh: 130,
      departsDay: "Daily (ex. Fri)",
      scheduledDepartureTime: "16:50",
      scheduledArrivalTime: "09:55",
      daysOfJourney: 2,
      routeDescription: "Via Kanpur Central, Prayagraj, Pt. Deen Dayal Upadhyaya, Gaya, Dhanbad",
      currentStatusDefaults: {
        currentStationIndex: 2, // CNB - Kanpur Central
        distanceTraveledKm: 440,
        currentSpeedKmh: 92,
        baseDelayMins: 24,
        statusNote: "Departed Kanpur Central (CNB) 24 mins late. High speed corridor ahead."
      },
      stations: [
        {
          code: "NDLS",
          name: "New Delhi",
          distanceKm: 0,
          day: 1,
          schArr: null,
          schDep: "16:50",
          platform: "16",
          slackMins: 0,
          historicalAvgDelayMins: 3,
          bottleneckRisk: "Low"
        },
        {
          code: "ALJN",
          name: "Aligarh Junction",
          distanceKm: 131,
          day: 1,
          schArr: "18:18",
          schDep: "18:20",
          platform: "3",
          slackMins: 5,
          historicalAvgDelayMins: 12,
          bottleneckRisk: "Medium"
        },
        {
          code: "CNB",
          name: "Kanpur Central",
          distanceKm: 440,
          day: 1,
          schArr: "21:32",
          schDep: "21:37",
          platform: "5",
          slackMins: 8,
          historicalAvgDelayMins: 22,
          bottleneckRisk: "High"
        },
        {
          code: "PRYJ",
          name: "Prayagraj Junction",
          distanceKm: 635,
          day: 1,
          schArr: "23:43",
          schDep: "23:45",
          platform: "4",
          slackMins: 10,
          historicalAvgDelayMins: 30,
          bottleneckRisk: "High"
        },
        {
          code: "DDU",
          name: "Pt. Deen Dayal Upadhyaya Jn",
          distanceKm: 787,
          day: 2,
          schArr: "01:37",
          schDep: "01:47",
          platform: "2",
          slackMins: 15,
          historicalAvgDelayMins: 45,
          bottleneckRisk: "Severe"
        },
        {
          code: "GAYA",
          name: "Gaya Junction",
          distanceKm: 992,
          day: 2,
          schArr: "03:55",
          schDep: "03:58",
          platform: "1",
          slackMins: 12,
          historicalAvgDelayMins: 35,
          bottleneckRisk: "Medium"
        },
        {
          code: "PNME",
          name: "Parasnath",
          distanceKm: 1145,
          day: 2,
          schArr: "05:43",
          schDep: "05:45",
          platform: "2",
          slackMins: 5,
          historicalAvgDelayMins: 28,
          bottleneckRisk: "Low"
        },
        {
          code: "DHN",
          name: "Dhanbad Junction",
          distanceKm: 1193,
          day: 2,
          schArr: "06:33",
          schDep: "06:38",
          platform: "1",
          slackMins: 10,
          historicalAvgDelayMins: 30,
          bottleneckRisk: "Medium"
        },
        {
          code: "ASN",
          name: "Asansol Junction",
          distanceKm: 1251,
          day: 2,
          schArr: "07:28",
          schDep: "07:30",
          platform: "5",
          slackMins: 8,
          historicalAvgDelayMins: 25,
          bottleneckRisk: "Medium"
        },
        {
          code: "HWH",
          name: "Howrah Junction",
          distanceKm: 1451,
          day: 2,
          schArr: "09:55",
          schDep: null,
          platform: "9",
          slackMins: 20,
          historicalAvgDelayMins: 20,
          bottleneckRisk: "Low"
        }
      ]
    },
    {
      id: "22436",
      number: "22436",
      name: "Vande Bharat Express",
      type: "Vande Bharat Express (Semi-High Speed)",
      origin: "NDLS",
      originName: "New Delhi",
      destination: "BSB",
      destinationName: "Varanasi Junction",
      totalDistanceKm: 759,
      avgSpeedKmh: 95,
      maxPermissibleSpeedKmh: 130,
      departsDay: "Tue, Wed, Fri, Sat, Sun",
      scheduledDepartureTime: "06:00",
      scheduledArrivalTime: "14:00",
      daysOfJourney: 1,
      routeDescription: "High-priority express via Kanpur Central and Prayagraj Jn",
      currentStatusDefaults: {
        currentStationIndex: 1,
        distanceTraveledKm: 280,
        currentSpeedKmh: 118,
        baseDelayMins: 5,
        statusNote: "Running at high speed (118 km/h). Minor 5 min signal clearance delay near Tundla."
      },
      stations: [
        {
          code: "NDLS",
          name: "New Delhi",
          distanceKm: 0,
          day: 1,
          schArr: null,
          schDep: "06:00",
          platform: "1",
          slackMins: 0,
          historicalAvgDelayMins: 1,
          bottleneckRisk: "Low"
        },
        {
          code: "CNB",
          name: "Kanpur Central",
          distanceKm: 440,
          day: 1,
          schArr: "10:08",
          schDep: "10:10",
          platform: "5",
          slackMins: 10,
          historicalAvgDelayMins: 8,
          bottleneckRisk: "Medium"
        },
        {
          code: "PRYJ",
          name: "Prayagraj Junction",
          distanceKm: 635,
          day: 1,
          schArr: "12:08",
          schDep: "12:10",
          platform: "6",
          slackMins: 10,
          historicalAvgDelayMins: 12,
          bottleneckRisk: "Medium"
        },
        {
          code: "BSB",
          name: "Varanasi Junction",
          distanceKm: 759,
          day: 1,
          schArr: "14:00",
          schDep: null,
          platform: "1",
          slackMins: 15,
          historicalAvgDelayMins: 6,
          bottleneckRisk: "Low"
        }
      ]
    },
    {
      id: "12952",
      number: "12952",
      name: "Mumbai Tejas Rajdhani Express",
      type: "Tejas Rajdhani Express",
      origin: "NDLS",
      originName: "New Delhi",
      destination: "MMCT",
      destinationName: "Mumbai Central",
      totalDistanceKm: 1386,
      avgSpeedKmh: 89,
      maxPermissibleSpeedKmh: 130,
      departsDay: "Daily",
      scheduledDepartureTime: "16:55",
      scheduledArrivalTime: "08:35",
      daysOfJourney: 2,
      routeDescription: "Via Kota, Ratlam, Vadodara, and Surat",
      currentStatusDefaults: {
        currentStationIndex: 2,
        distanceTraveledKm: 466,
        currentSpeedKmh: 105,
        baseDelayMins: 14,
        statusNote: "Approaching Kota Junction. Cross-traffic at junction causing 14m delay."
      },
      stations: [
        {
          code: "NDLS",
          name: "New Delhi",
          distanceKm: 0,
          day: 1,
          schArr: null,
          schDep: "16:55",
          platform: "3",
          slackMins: 0,
          historicalAvgDelayMins: 2,
          bottleneckRisk: "Low"
        },
        {
          code: "MTJ",
          name: "Mathura Junction",
          distanceKm: 141,
          day: 1,
          schArr: "18:28",
          schDep: "18:30",
          platform: "2",
          slackMins: 5,
          historicalAvgDelayMins: 8,
          bottleneckRisk: "Medium"
        },
        {
          code: "KOTA",
          name: "Kota Junction",
          distanceKm: 466,
          day: 1,
          schArr: "21:30",
          schDep: "21:40",
          platform: "1",
          slackMins: 10,
          historicalAvgDelayMins: 15,
          bottleneckRisk: "High"
        },
        {
          code: "RTM",
          name: "Ratlam Junction",
          distanceKm: 732,
          day: 2,
          schArr: "00:55",
          schDep: "00:58",
          platform: "4",
          slackMins: 12,
          historicalAvgDelayMins: 20,
          bottleneckRisk: "High"
        },
        {
          code: "BRC",
          name: "Vadodara Junction",
          distanceKm: 993,
          day: 2,
          schArr: "03:52",
          schDep: "04:02",
          platform: "2",
          slackMins: 14,
          historicalAvgDelayMins: 18,
          bottleneckRisk: "Medium"
        },
        {
          code: "ST",
          name: "Surat",
          distanceKm: 1123,
          day: 2,
          schArr: "05:13",
          schDep: "05:18",
          platform: "1",
          slackMins: 10,
          historicalAvgDelayMins: 14,
          bottleneckRisk: "Medium"
        },
        {
          code: "BVI",
          name: "Borivali",
          distanceKm: 1356,
          day: 2,
          schArr: "07:51",
          schDep: "07:53",
          platform: "7",
          slackMins: 12,
          historicalAvgDelayMins: 16,
          bottleneckRisk: "High"
        },
        {
          code: "MMCT",
          name: "Mumbai Central",
          distanceKm: 1386,
          day: 2,
          schArr: "08:35",
          schDep: null,
          platform: "5",
          slackMins: 15,
          historicalAvgDelayMins: 10,
          bottleneckRisk: "Low"
        }
      ]
    },
    {
      id: "12626",
      number: "12626",
      name: "Kerala Superfast Express",
      type: "Superfast Express",
      origin: "NDLS",
      originName: "New Delhi",
      destination: "TVC",
      destinationName: "Trivandrum Central",
      totalDistanceKm: 3031,
      avgSpeedKmh: 64,
      maxPermissibleSpeedKmh: 110,
      departsDay: "Daily",
      scheduledDepartureTime: "20:10",
      scheduledArrivalTime: "18:00",
      daysOfJourney: 3,
      routeDescription: "Trans-India long haul via Bhopal, Nagpur, Vijayawada, and Ernakulam",
      currentStatusDefaults: {
        currentStationIndex: 3,
        distanceTraveledKm: 410,
        currentSpeedKmh: 82,
        baseDelayMins: 42,
        statusNote: "Delayed by 42m due to freight congestion between Gwalior and Jhansi."
      },
      stations: [
        {
          code: "NDLS",
          name: "New Delhi",
          distanceKm: 0,
          day: 1,
          schArr: null,
          schDep: "20:10",
          platform: "5",
          slackMins: 0,
          historicalAvgDelayMins: 5,
          bottleneckRisk: "Low"
        },
        {
          code: "AGC",
          name: "Agra Cantt",
          distanceKm: 195,
          day: 1,
          schArr: "22:20",
          schDep: "22:25",
          platform: "1",
          slackMins: 8,
          historicalAvgDelayMins: 20,
          bottleneckRisk: "Medium"
        },
        {
          code: "GWL",
          name: "Gwalior Junction",
          distanceKm: 313,
          day: 1,
          schArr: "23:55",
          schDep: "23:57",
          platform: "1",
          slackMins: 10,
          historicalAvgDelayMins: 32,
          bottleneckRisk: "High"
        },
        {
          code: "VGLB",
          name: "Virangana Lakshmibai Jhansi",
          distanceKm: 410,
          day: 2,
          schArr: "01:30",
          schDep: "01:38",
          platform: "2",
          slackMins: 15,
          historicalAvgDelayMins: 45,
          bottleneckRisk: "High"
        },
        {
          code: "BPL",
          name: "Bhopal Junction",
          distanceKm: 702,
          day: 2,
          schArr: "05:20",
          schDep: "05:25",
          platform: "1",
          slackMins: 15,
          historicalAvgDelayMins: 50,
          bottleneckRisk: "High"
        },
        {
          code: "NGP",
          name: "Nagpur Junction",
          distanceKm: 1092,
          day: 2,
          schArr: "11:45",
          schDep: "11:50",
          platform: "2",
          slackMins: 20,
          historicalAvgDelayMins: 60,
          bottleneckRisk: "High"
        },
        {
          code: "BZA",
          name: "Vijayawada Junction",
          distanceKm: 1756,
          day: 2,
          schArr: "22:15",
          schDep: "22:25",
          platform: "7",
          slackMins: 25,
          historicalAvgDelayMins: 55,
          bottleneckRisk: "Severe"
        },
        {
          code: "RU",
          name: "Renigunta Junction",
          distanceKm: 2133,
          day: 3,
          schArr: "04:10",
          schDep: "04:15",
          platform: "3",
          slackMins: 15,
          historicalAvgDelayMins: 40,
          bottleneckRisk: "Medium"
        },
        {
          code: "ED",
          name: "Erode Junction",
          distanceKm: 2470,
          day: 3,
          schArr: "09:40",
          schDep: "09:45",
          platform: "2",
          slackMins: 20,
          historicalAvgDelayMins: 30,
          bottleneckRisk: "Medium"
        },
        {
          code: "ERS",
          name: "Ernakulam Junction",
          distanceKm: 2825,
          day: 3,
          schArr: "14:40",
          schDep: "14:45",
          platform: "1",
          slackMins: 18,
          historicalAvgDelayMins: 25,
          bottleneckRisk: "Medium"
        },
        {
          code: "TVC",
          name: "Trivandrum Central",
          distanceKm: 3031,
          day: 3,
          schArr: "18:00",
          schDep: null,
          platform: "3",
          slackMins: 30,
          historicalAvgDelayMins: 35,
          bottleneckRisk: "Low"
        }
      ]
    }
  ];
})();
