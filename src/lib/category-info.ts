import type { UnitCategory } from '@/types';

export type CategoryInfo = {
  category: UnitCategory;
  slug: string;
  title: string;
  heroTagline: string;
  description: string;
  intro: string;
  quickTips: string[];
  useCases: string[];
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  faq: Array<{ question: string; answer: string }>;
};

const defaultSlug = (category: UnitCategory): string =>
  `${category.toLowerCase().replace(/\s+/g, '-')}-conversion`;

const baseCategoryInfo: Record<UnitCategory, Omit<CategoryInfo, 'category' | 'slug'>> = {
  Length: {
    title: 'Length Converter & Reference',
    heroTagline: 'Compare distances from nanometers to intercontinental flights.',
    description:
      'The length reference brings metric and imperial measurements together so you can swap between meters, feet, and miles without reaching for a textbook.',
    intro:
      'Length is the foundation of engineering, construction, mapping, and day-to-day DIY projects. The tables and guidance below highlight the base SI unit (meter), how other units relate to it, and the conversions people ask for most often.',
    quickTips: [
      'To jump between metric and imperial, remember that 1 meter is approximately 3.28084 feet and 1 inch is exactly 25.4 millimeters.',
      'When scaling drawings, double-check powers: moving from length to area or volume requires squaring or cubing the conversion factor.',
      'Use kilometers for road distances, meters for building plans, and millimeters for machining or 3D-printing tolerances.',
    ],
    useCases: [
      'Architects translating site plans between metric and imperial standard sizes.',
      'Logistics teams checking pallet lengths against container dimensions.',
      'Travelers comparing running routes or hiking trails shared in a different unit system.',
    ],
    seo: {
      title: 'Length Converter & Chart | SwapUnits',
      description:
        'Convert between meters, feet, miles, inches, and more with quick reference charts and tips on when to use each length unit.',
      keywords: [
        'length converter',
        'meters to feet',
        'kilometer conversion',
        'imperial to metric length',
        'distance conversion chart',
        'SwapUnits length table',
      ],
    },
    faq: [
      {
        question: 'What is the base unit for length?',
        answer:
          'The meter (m) is the SI base unit. All other length measurements in the table convert back to meters, which keeps calculations consistent.',
      },
      {
        question: 'How do I convert inches to millimeters quickly?',
        answer:
          'Multiply inches by 25.4 to get millimeters. Because this relationship is exact, it is reliable for engineering and machining work.',
      },
      {
        question: 'Why do surveyors prefer meters instead of feet?',
        answer:
          'Meters tie directly to the global geodetic reference system, which makes integrating GPS data with surveying instruments much easier.',
      },
    ],
  },
  Mass: {
    title: 'Mass Converter & Reference',
    heroTagline: 'Move between grams, kilograms, ounces, and tons with confidence.',
    description:
      'This mass guide keeps metric and customary weight units in one place so you can verify recipes, lab notes, and shipping specs in seconds.',
    intro:
      'Mass conversions pop up in everything from baking to freight forwarding. Use the reference below to see how each unit ties back to the SI kilogram and to learn the shortcuts professionals rely on.',
    quickTips: [
      'One kilogram equals 2.20462 avoirdupois pounds, which is the standard used in most US shipping paperwork.',
      'Milligrams and ounces rarely mix; switch to grams first to avoid rounding errors in chemistry or pharmacology.',
      'Metric tons (t) and US tons (short ton) differ by about 9%; double-check the unit whenever you see “ton” in a contract.',
    ],
    useCases: [
      'Food scientists scaling formulations between metric lab batches and imperial production recipes.',
      'Freight teams reconciling container weight limits stated in kilograms and pounds.',
      'Athletes tracking strength gains in kilograms while competitions list attempts in pounds.',
    ],
    seo: {
      title: 'Mass & Weight Conversion Chart | SwapUnits',
      description:
        'Instantly convert between grams, kilograms, pounds, ounces, and tons. Explore quick tips, use cases, and detailed mass tables.',
      keywords: [
        'mass converter',
        'kilograms to pounds',
        'grams to ounces',
        'weight conversion chart',
        'metric ton vs us ton',
        'SwapUnits mass table',
      ],
    },
    faq: [
      {
        question: 'What is the difference between mass and weight?',
        answer:
          'Mass measures how much matter an object contains, while weight is the force exerted by gravity on that mass. Everyday conversions treat them similarly, but scientific calculations distinguish the two.',
      },
      {
        question: 'Why is the kilogram the base SI unit instead of the gram?',
        answer:
          'The International System of Units chose the kilogram as the base unit so that the derived unit for force (newton) maintains practical magnitudes in physics and engineering.',
      },
      {
        question: 'How accurate is the gram-to-ounce relationship?',
        answer:
          'The conversion 1 ounce = 28.3495 grams is exact enough for gourmet baking and nutrition labels. For pharmaceutical precision, convert to milligrams and work with mass balances.',
      },
    ],
  },
  Temperature: {
    title: 'Temperature Converter & Guide',
    heroTagline: 'Translate Celsius, Fahrenheit, and Kelvin without second-guessing offsets.',
    description:
      'Temperature conversions require both scaling and offset adjustments. This page explains the formulas and gives convenient reference points for daily life and lab work.',
    intro:
      'Unlike distance or mass, temperature scales are not simple multiples of each other. Celsius and Fahrenheit include offsets, while Kelvin starts at absolute zero. Use the guidance below to keep formulas straight and avoid costly mistakes.',
    quickTips: [
      'Fahrenheit to Celsius: subtract 32, then multiply by 5/9. Celsius to Fahrenheit: multiply by 9/5, then add 32.',
      'Kelvin and Celsius share the same degree magnitude; add or subtract 273.15 to move between them.',
      'Cooking recipes in Fahrenheit often round to the nearest 5-degree increment—convert and round back to match appliance dials.',
    ],
    useCases: [
      'HVAC technicians aligning thermostat settings across Celsius and Fahrenheit interfaces.',
      'Researchers logging environmental data in Kelvin for simulations while field gear records Celsius.',
      'Home chefs converting international recipes to match local oven settings.',
    ],
    seo: {
      title: 'Temperature Converter (°C ⇄ °F ⇄ K) | SwapUnits',
      description:
        'Convert Celsius, Fahrenheit, and Kelvin with clear formulas, reference tables, and practical temperature tips.',
      keywords: [
        'temperature converter',
        'celsius to fahrenheit',
        'fahrenheit to kelvin',
        'temperature conversion chart',
        'c to f formula',
        'SwapUnits temperature guide',
      ],
    },
    faq: [
      {
        question: 'Why does temperature conversion need an offset?',
        answer:
          'Celsius and Fahrenheit define zero at different physical phenomena (freezing water vs. a salted brine). Because of that shift, you must adjust by 32° before scaling the Fahrenheit value.',
      },
      {
        question: 'When should I work in Kelvin instead of Celsius?',
        answer:
          'Kelvin is essential for scientific calculations involving the gas laws, thermodynamics, or absolute temperature differences. It removes negative values and aligns directly with energy equations.',
      },
      {
        question: 'Is 0 °C the same as 273 K?',
        answer:
          '0 °C equals 273.15 K. Kelvin is offset by 273.15 degrees from Celsius, so always include the decimal if your work requires precision.',
      },
    ],
  },
  Time: {
    title: 'Time Conversion Reference',
    heroTagline: 'Sync schedules from nanoseconds to multi-year roadmaps.',
    description:
      'Time conversions power everything from embedded electronics to international projects. The table below places each unit relative to the SI second.',
    intro:
      'Modern systems rely on precise timing. Whether you are scheduling builds, calculating latency, or summarizing historical spans, consistent units prevent misunderstandings.',
    quickTips: [
      'Milliseconds (ms) are ideal for UX performance targets; anything under 100 ms feels instantaneous to most users.',
      'Use ISO 8601 timestamps to avoid ambiguity when sharing data across time zones.',
      'Leap years add 86,400 seconds; when building financial or scientific models, confirm whether the dataset accounts for them.',
    ],
    useCases: [
      'Product managers translating scrum sprints into executive-friendly quarter plans.',
      'Engineers benchmarking request latency in milliseconds while dashboards show seconds.',
      'Educators comparing historical events across centuries with the same time base.',
    ],
    seo: {
      title: 'Time Converter & Unit Chart | SwapUnits',
      description:
        'Convert between seconds, minutes, hours, days, and scientific time units with practical tips on where each unit fits best.',
      keywords: [
        'time converter',
        'seconds to minutes',
        'hours to days',
        'time unit chart',
        'milliseconds latency',
        'SwapUnits time table',
      ],
    },
    faq: [
      {
        question: 'What is the base unit of time?',
        answer:
          'The second (s) is the SI base unit for time. All other durations—minutes, hours, days—are multiples of the second.',
      },
      {
        question: 'How many seconds are in a year?',
        answer:
          'One common approximation is 31,536,000 seconds (365 days). For leap years, add 86,400 seconds to that total.',
      },
      {
        question: 'When should I use milliseconds versus microseconds?',
        answer:
          'Milliseconds are a sweet spot for application-level performance metrics. Microseconds are reserved for embedded systems, trading algorithms, or scientific instrumentation.',
      },
    ],
  },
  Pressure: {
    title: 'Pressure Conversion Cheat Sheet',
    heroTagline: 'Translate kilopascals, bar, atmospheres, and psi without recalculating from scratch.',
    description:
      'Pressure units span mechanical engineering, meteorology, and scuba diving. This page highlights how they line up and when each one appears in the field.',
    intro:
      'Because pressure equals force divided by area, unit systems vary widely. Use the table to compare readings from gauges, weather bulletins, or hydraulic equipment.',
    quickTips: [
      '1 atmosphere (atm) equals 101.325 kilopascals (kPa) and 14.6959 psi—handy numbers for quick mental checks.',
      'When diving, pressure rises by roughly 1 atm every 10 meters (33 feet) of seawater.',
      'Keep an eye on whether a specification uses gauge pressure (relative to ambient) or absolute pressure.',
    ],
    useCases: [
      'Mechanical engineers cross-checking pneumatic system specs that mix psi and bar.',
      'Meteorologists translating hectopascal reports into inches of mercury for public broadcasts.',
      'Scuba instructors teaching students how breathing gas pressure changes with depth.',
    ],
    seo: {
      title: 'Pressure Converter (kPa, bar, atm, psi) | SwapUnits',
      description:
        'Compare pressure units with quick conversions, tables, and guidance on when to use kPa, bar, atm, or psi.',
      keywords: [
        'pressure converter',
        'kpa to psi',
        'atm to kpa',
        'bar pressure chart',
        'pressure unit comparison',
        'SwapUnits pressure guide',
      ],
    },
    faq: [
      {
        question: 'Why do tire gauges use psi in some countries and kPa in others?',
        answer:
          'Psi is common in the US, while Canada, Europe, and many Asia-Pacific countries use kilopascals. Every modern tire sidewall lists both, so you can always cross-check.',
      },
      {
        question: 'How do I compare gauge pressure to absolute pressure?',
        answer:
          'Absolute pressure equals gauge pressure plus atmospheric pressure. Add roughly 101.3 kPa (or 14.7 psi) to convert gauge readings to absolute values at sea level.',
      },
      {
        question: 'What is bar used for?',
        answer:
          'Bar is convenient for industrial hydraulics because it stays close to atmospheric pressure values. Many European pumps, compressors, and diving instruments quote bar alongside psi or kPa.',
      },
    ],
  },
  Area: {
    title: 'Area Converter & Surface Reference',
    heroTagline: 'Move from square millimeters to acres without misplacing zeros.',
    description:
      'Area conversions square the linear ratios, making them easy to miscalculate. This guide keeps the relationships visible and practical.',
    intro:
      'Whether you are sizing floor plans, farmland, or map tiles, consistent area units avoid mispriced materials and misrepresented scope. Refer to the table to compare each unit with the base square meter.',
    quickTips: [
      'To convert between square feet and square meters, remember that 1 ft² ≈ 0.092903 m².',
      'Hectares are exactly 10,000 m². Acres are smaller—about 4,046.86 m²—so don’t treat them as interchangeable.',
      'When scaling drawings, square the length scale factor. Doubling a linear dimension multiplies area by four.',
    ],
    useCases: [
      'Real estate professionals reconciling lot sizes advertised in acres with planning documents in square meters.',
      'Fabricators estimating material usage when CAD files mix imperial and metric inputs.',
      'GIS analysts translating satellite data pixels into region area summaries.',
    ],
    seo: {
      title: 'Area Conversion Chart | SwapUnits',
      description:
        'Convert square meters, square feet, hectares, acres, and more. Learn the shortcuts that prevent scaling mistakes.',
      keywords: [
        'area converter',
        'square meters to square feet',
        'acre to hectare',
        'surface area conversion',
        'area conversion table',
        'SwapUnits area guide',
      ],
    },
    faq: [
      {
        question: 'Why is area conversion trickier than length?',
        answer:
          'Area magnifies the scaling factor because both width and height change. Doubling length multiplies area by four. Keep track of squared units to avoid underestimating materials.',
      },
      {
        question: 'When is a hectare more useful than an acre?',
        answer:
          'Hectares align with the metric system and are the standard in agriculture outside the US. They make percentage calculations easier for crop planning and reporting.',
      },
      {
        question: 'What is a square kilometer used for?',
        answer:
          'Square kilometers are ideal for mapping territory, city footprints, and large infrastructure projects. One square kilometer equals 100 hectares.',
      },
    ],
  },
  Volume: {
    title: 'Volume Converter & Liquid Reference',
    heroTagline: 'Pour confidently across liters, gallons, milliliters, and cubic measures.',
    description:
      'Volume links everyday cooking to industrial batching. This page clarifies how volumetric units relate and provides quick context for metric and customary systems.',
    intro:
      'Use the volume table to keep track of liters, gallons, and cubic measures when designing recipes, chemical batches, or storage containers. Converting consistently keeps yields and costing on target.',
    quickTips: [
      'One liter is 1.05669 US liquid quarts. Double-check whether a recipe lists US or imperial units; UK gallons are about 20% larger.',
      'Milliliters (mL) and cubic centimeters (cm³) are interchangeable—one cube centimeter of water is exactly one milliliter.',
      'For shipping tanks, cubic meters (m³) convert neatly to liters by multiplying by 1,000.',
    ],
    useCases: [
      'Baristas converting syrup recipes from metric test batches to ounce-based cafe menus.',
      'Brewers aligning mash volumes stated in gallons with equipment that measures in liters.',
      'Lab technicians dosing reagents when equipment is calibrated in cubic centimeters.',
    ],
    seo: {
      title: 'Volume Converter (Liters, Gallons, mL) | SwapUnits',
      description:
        'Convert liters to gallons, milliliters, cups, and cubic meters. Explore practical volume tips and tables for kitchen, lab, and industrial work.',
      keywords: [
        'volume converter',
        'liters to gallons',
        'ml to cups',
        'cubic meter conversion',
        'liquid measurement chart',
        'SwapUnits volume table',
      ],
    },
    faq: [
      {
        question: 'Are US and UK gallons the same?',
        answer:
          'No. A US gallon is 3.78541 liters, while an imperial gallon is 4.54609 liters. Always confirm which measurement you are working with.',
      },
      {
        question: 'How do I convert teaspoons to milliliters?',
        answer:
          'In the US system, 1 teaspoon equals approximately 4.92892 mL. Many kitchen conversions round to 5 mL for convenience.',
      },
      {
        question: 'What does a cubic meter represent?',
        answer:
          'A cubic meter equals 1,000 liters. Picture a box one meter on each side. It’s a common unit for water utilities, logistics, and construction concrete pours.',
      },
    ],
  },
  Energy: {
    title: 'Energy Conversion Guide',
    heroTagline: 'Track joules, calories, BTU, and kWh in the same dashboard.',
    description:
      'Energy units appear in fitness trackers, electrical billing, and industrial heating. This guide keeps the relationships clear so you can reconcile reports in any system.',
    intro:
      'Because energy spans mechanical work and heat, legacy and modern units coexist. Use the table to relate them all back to the joule, then cross-check the most common conversions for your domain.',
    quickTips: [
      '1 kilowatt-hour equals 3.6 million joules (3.6 MJ). Remember this when comparing electricity usage with natural gas or fuel oil.',
      'Food calories printed on labels are actually kilocalories. Multiply the nutrition “Calorie” value by 4.184 to convert to kilojoules.',
      'BTU (British Thermal Unit) is still used in HVAC sizing—12,000 BTU per hour equals one ton of cooling.',
    ],
    useCases: [
      'Sustainability analysts translating utility bills into a unified carbon footprint metric.',
      'Athletes comparing gym equipment readouts (often in calories) with science-based joule targets.',
      'Mechanical engineers balancing heater specs given in BTU with electrical systems designed in kWh.',
    ],
    seo: {
      title: 'Energy Converter (Joules, Calories, BTU, kWh) | SwapUnits',
      description:
        'Convert energy between joules, calories, BTU, and kilowatt-hours. Understand when each unit applies and how to compare them.',
      keywords: [
        'energy converter',
        'joules to calories',
        'kwh to joules',
        'btu conversion chart',
        'energy unit comparison',
        'SwapUnits energy guide',
      ],
    },
    faq: [
      {
        question: 'Why do nutrition labels use Calories with a capital C?',
        answer:
          'A nutrition “Calorie” is a kilocalorie—the energy needed to raise 1 kilogram of water by 1 °C. Scientists often write kcal, while consumer packaging simplifies it to Calorie.',
      },
      {
        question: 'How many BTU are in a kilowatt-hour?',
        answer:
          'One kilowatt-hour equals roughly 3,412 BTU. HVAC designers use this conversion when comparing electric and gas heating efficiency.',
      },
      {
        question: 'Is a joule the same as a newton-meter?',
        answer:
          'Yes. One joule equals the work done by one newton of force acting through one meter. It is the SI unit for energy.',
      },
    ],
  },
  Speed: {
    title: 'Speed Conversion Summary',
    heroTagline: 'Shift between km/h, mph, m/s, and knots without leaving the dashboard.',
    description:
      'Speed conversions help compare dashboards, vehicle specs, and weather data. This guide explains the differences and keeps the math in one place.',
    intro:
      'Different industries prefer different speed units: automotive dashboards show miles or kilometers per hour, pilots rely on knots, and physics models use meters per second. Use the reference below to keep them aligned.',
    quickTips: [
      'Multiply meters per second by 3.6 to get kilometers per hour. Multiply by 2.23694 for miles per hour.',
      'Knots measure nautical miles per hour. 1 knot equals 1.15078 mph or 1.852 km/h.',
      'Running pace charts invert speed; a 4:00 min/km pace equals 15 km/h. Converting speed first makes pace math easier.',
    ],
    useCases: [
      'Fleet managers reconciling telematics data reported in km/h with fuel stats captured in mph.',
      'Pilots and mariners translating weather advisories into the unit used by onboard instruments.',
      'Athletes comparing treadmill workouts (often mph) with outdoor GPS runs (frequently km/h).',
    ],
    seo: {
      title: 'Speed Converter (mph, km/h, m/s, knots) | SwapUnits',
      description:
        'Convert speeds between miles per hour, kilometers per hour, meters per second, and knots with ready-made references.',
      keywords: [
        'speed converter',
        'mph to km/h',
        'knots to mph',
        'meters per second conversion',
        'pace vs speed chart',
        'SwapUnits speed guide',
      ],
    },
    faq: [
      {
        question: 'Why do pilots use knots?',
        answer:
          'Knots are based on nautical miles, which tie directly to latitude and longitude. Using knots keeps navigation calculations consistent worldwide.',
      },
      {
        question: 'How do I convert pace to speed?',
        answer:
          'First convert pace (minutes per distance) into total seconds, divide distance by time to get speed, then convert to your preferred unit (km/h or mph).',
      },
      {
        question: 'What is meters per second commonly used for?',
        answer:
          'Meters per second is the SI unit for speed and appears in physics problems, wind tunnel tests, and scientific instrumentation.',
      },
    ],
  },
  'Fuel Economy': {
    title: 'Fuel Economy & Efficiency Reference',
    heroTagline: 'Compare MPG, L/100 km, and EV efficiency without breaking formulas.',
    description:
      'Fuel economy units flip between “distance per unit of fuel” and “fuel per unit of distance.” This guide clarifies the difference and shows you how to move between them.',
    intro:
      'Use the tables to compare combustion vehicle ratings with electric vehicle efficiency metrics. Pay attention to whether a unit rewards higher or lower numbers and convert accordingly.',
    quickTips: [
      'Higher is better for km/L or MPG. Lower is better for L/100 km or kWh/100 km. The conversion tables highlight which direction indicates efficiency gains.',
      'To convert MPG (US) to L/100 km, divide 235.214 by the MPG value.',
      'EV drivers often compare mi/kWh; multiply by 0.621371 to switch between kilometers and miles in efficiency stats.',
    ],
    useCases: [
      'Automotive analysts comparing fleet efficiency targets in markets that report MPG, km/L, or L/100 km.',
      'EV owners reviewing utility statements in kWh while trip planners show energy use in mi/kWh.',
      'Corporate sustainability teams compiling cross-brand fuel data into one global report.',
    ],
    seo: {
      title: 'Fuel Economy Converter (MPG ⇄ L/100 km ⇄ km/L) | SwapUnits',
      description:
        'Understand combustion and EV efficiency with side-by-side conversions between MPG, L/100 km, km/L, and kWh/100 km.',
      keywords: [
        'fuel economy converter',
        'mpg to l/100km',
        'km per liter conversion',
        'ev efficiency chart',
        'fuel consumption calculator',
        'SwapUnits fuel economy guide',
      ],
    },
    faq: [
      {
        question: 'Why are some fuel economy numbers better when they are lower?',
        answer:
          'Units like L/100 km or kWh/100 km measure consumption per distance, so lower values mean less energy used. Units like MPG or km/L measure distance per fuel, so higher values are better.',
      },
      {
        question: 'How do I compare US MPG with UK MPG?',
        answer:
          'UK (imperial) gallons are larger. To convert US MPG to UK MPG, multiply by 1.20095. The reverse conversion divides by the same factor.',
      },
      {
        question: 'What should EV drivers monitor besides mi/kWh?',
        answer:
          'Include charging efficiency and ambient temperature. Cold weather and high-speed driving reduce mi/kWh even if the rated consumption stays constant.',
      },
    ],
  },
  'Data Storage': {
    title: 'Data Storage Conversion Library',
    heroTagline: 'Scale bytes, kilobytes, megabytes, and terabytes accurately—decimal or binary.',
    description:
      'Storage vendors and operating systems toggle between decimal (powers of 10) and binary (powers of 2) units. This reference clarifies both systems so capacity reports stop disagreeing.',
    intro:
      'Hard drives, SSDs, memory modules, and file systems each use different conventions. The table highlights the decimal units (kB, MB, GB) alongside the binary versions (KiB, MiB, GiB) so you know how much space you really have.',
    quickTips: [
      'Manufacturers advertise decimal gigabytes (1 GB = 1,000,000,000 bytes). Operating systems often report binary gibibytes (1 GiB = 1,073,741,824 bytes).',
      'When sizing RAM, stick to binary units (MiB, GiB) to match how CPUs address memory.',
      'Divide by 1024 (not 1000) when moving between binary-prefixed units.',
    ],
    useCases: [
      'IT teams reconciling advertised storage capacity with OS-level disk usage.',
      'Developers sizing caches, logs, and uploads in consistent units across services.',
      'Consumers comparing cloud storage plans that mix terabytes and gibibytes.',
    ],
    seo: {
      title: 'Data Storage Converter (Bytes ⇄ KB ⇄ MB ⇄ GB) | SwapUnits',
      description:
        'Convert digital storage sizes with confidence. Understand the difference between decimal and binary units and use the right factor every time.',
      keywords: [
        'data storage converter',
        'bytes to gigabytes',
        'kb vs kib',
        'storage capacity chart',
        'binary vs decimal storage',
        'SwapUnits data table',
      ],
    },
    faq: [
      {
        question: 'Why does my computer show less space than advertised?',
        answer:
          'Manufacturers use decimal units, so a 1 TB drive equals 1,000,000,000,000 bytes. Operating systems often divide by 1,073,741,824 to report gibibytes (GiB), which yields a smaller number.',
      },
      {
        question: 'What is the difference between MB and MiB?',
        answer:
          'MB (megabyte) equals 1,000,000 bytes. MiB (mebibyte) equals 1,048,576 bytes. Software developers prefer MiB to avoid ambiguity in memory size calculations.',
      },
      {
        question: 'How many gigabytes are in a terabyte?',
        answer:
          'In decimal terms, 1 TB equals 1,000 GB. In binary terms, 1 TiB equals 1,024 GiB. Check which prefix your tool displays before converting.',
      },
    ],
  },
  'Data Transfer Rate': {
    title: 'Data Transfer Rate Converter',
    heroTagline: 'Benchmark bandwidth from bits per second to gigabytes per second.',
    description:
      'Networks, storage buses, and codecs each choose their own data rate units. This guide lines them up and shows you how to compare throughput fairly.',
    intro:
      'Bits per second dominate networking, while bytes per second are popular in storage and OS utilities. Keep both in sight to avoid overestimating download times or undersizing links.',
    quickTips: [
      'Divide Mbps by 8 to estimate MB/s. Multiply MB/s by 8 to go back to bits per second.',
      'Advertised broadband speeds are in megabits. File transfer utilities usually display megabytes per second.',
      'Latency (ms) and throughput (Mbps) are independent; high bandwidth does not guarantee quick response time.',
    ],
    useCases: [
      'Network engineers comparing WAN contracts stated in Mbps with application requirements written in MB/s.',
      'Content teams estimating upload times for large media files.',
      'IT departments validating that backup windows fit within available bandwidth.',
    ],
    seo: {
      title: 'Data Transfer Rate Converter (bps, Mbps, MB/s, Gbps) | SwapUnits',
      description:
        'Convert data rates between bits and bytes per second, from Kbps through Gbps. Understand how advertised bandwidth compares to real-world throughput.',
      keywords: [
        'data transfer rate converter',
        'mbps to mb/s',
        'bandwidth calculator',
        'network speed conversion',
        'bps to kbps to gbps',
        'SwapUnits bandwidth guide',
      ],
    },
    faq: [
      {
        question: 'Why are download speeds slower than my ISP plan?',
        answer:
          'Plans advertise megabits per second. Downloads often display megabytes per second. Divide the plan speed by 8 to estimate top download speeds before protocol overhead.',
      },
      {
        question: 'What is the practical difference between Mbps and MB/s?',
        answer:
          'Megabits per second (Mbps) count bits. Megabytes per second (MB/s) count bytes. Since one byte equals eight bits, MB/s is smaller numerically but measures actual file size movement.',
      },
      {
        question: 'When should I monitor Gbps instead of Mbps?',
        answer:
          'Use Gbps for datacenter trunks, high-performance storage, or backbone links. Mbps remains the norm for office LANs and consumer connections.',
      },
    ],
  },
  Bitcoin: {
    title: 'Bitcoin & Satoshi Conversion Guide',
    heroTagline: 'Keep BTC, satoshis, and fiat comparisons aligned.',
    description:
      'Bitcoin denominations range from whole coins for treasury discussions down to satoshis for micropayments. This reference keeps the math straight and showcases everyday use cases.',
    intro:
      'One bitcoin contains 100,000,000 satoshis, and Lightning Network invoices frequently rely on those smaller units. Use the tables below to understand BTC subdivisions and compare them with traditional currency values.',
    quickTips: [
      '1 BTC = 100,000,000 sat (satoshis). To convert BTC to sat, multiply by 1e8.',
      'MilliBTC (mBTC) equals 0.001 BTC. MicroBTC (µBTC) equals 0.000001 BTC. They are handy for wallet UI display.',
      'When quoting prices, decide upfront whether to use BTC, sat, or fiat currency to avoid confusion in a negotiation.',
    ],
    useCases: [
      'Crypto treasurers reconciling balances denominated in BTC with Lightning invoices sent in satoshis.',
      'Developers pricing API calls in sat to support microtransactions.',
      'Analysts translating on-chain volume into fiat currency for reporting.',
    ],
    seo: {
      title: 'Bitcoin Unit Converter (BTC ⇄ sat) | SwapUnits',
      description:
        'Convert between bitcoin, satoshis, and sub-units like mBTC. Learn practical tips for pricing, reporting, and Lightning Network payments.',
      keywords: [
        'bitcoin converter',
        'btc to sat',
        'satoshi conversion',
        'mbtc to btc',
        'bitcoin unit chart',
        'SwapUnits bitcoin guide',
      ],
    },
    faq: [
      {
        question: 'How many satoshis make up one bitcoin?',
        answer:
          'One bitcoin equals exactly 100,000,000 satoshis. The satoshi is the smallest unit currently transactable on the Bitcoin network.',
      },
      {
        question: 'What are common subdivisions of bitcoin?',
        answer:
          'mBTC represents one-thousandth of a bitcoin (0.001 BTC). µBTC or “bits” represent one-millionth (0.000001 BTC). Lightning invoices often use satoshis directly.',
      },
      {
        question: 'Why do some wallets show BTC while others show sat?',
        answer:
          'Showing BTC keeps balances compact for large holdings. Displaying satoshis is friendlier for small payments. Many wallets let you toggle the preferred display unit.',
      },
    ],
  },
};

const categoryInfoMap: Record<UnitCategory, CategoryInfo> = Object.fromEntries(
  (Object.entries(baseCategoryInfo) as Array<[UnitCategory, Omit<CategoryInfo, 'category' | 'slug'>]>).map(
    ([category, info]) => [
      category,
      {
        category,
        slug: defaultSlug(category),
        ...info,
      },
    ],
  ),
) as Record<UnitCategory, CategoryInfo>;

export const categoryInfoList: CategoryInfo[] = Object.values(categoryInfoMap);

export const slugToCategoryInfo = new Map<string, CategoryInfo>(
  categoryInfoList.map((info) => [info.slug, info]),
);

export const categorySlugMap = new Map<UnitCategory, string>(
  categoryInfoList.map((info) => [info.category, info.slug]),
);

export function getCategoryInfo(category: UnitCategory): CategoryInfo {
  return categoryInfoMap[category];
}

export function getCategoryInfoBySlug(slug: string): CategoryInfo | undefined {
  return slugToCategoryInfo.get(slug);
}

export function getCategorySlug(category: UnitCategory): string {
  return categorySlugMap.get(category) ?? defaultSlug(category);
}
