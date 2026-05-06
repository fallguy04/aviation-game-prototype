import { GameState, Player, Airline } from '../types/GameTypes';
import { ROUTES } from './routeData';

const createBaseRouteState = () => {
  const rs: Record<string, { primary: string | null; secondary: string | null }> = {};
  ROUTES.forEach(r => { rs[r.id] = { primary: null, secondary: null }; });
  return rs;
};

/**
 * NEW VALUATION MODEL: Based on Earnings potential rather than just asset count.
 * This ensures that a highly profitable Big Three carrier is appropriately expensive
 * to acquire compared to a low-margin startup.
 */
const computeStockPrice = (airline: { id: string, routes: string[], hubs: string[] }, state: Partial<GameState>): number => {
  let netRevenue = 0;
  const routeState = state.routeState || {};
  const cityDemand = state.cityDemand || {};

  airline.routes.forEach(routeId => {
    const slotState = routeState[routeId];
    if (!slotState) return;
    
    const routeDef = ROUTES.find(r => r.id === routeId);
    if (!routeDef) return;
    
    let routeRevenue = (cityDemand[routeDef.from] ?? 1) + (cityDemand[routeDef.to] ?? 1);
    if (airline.hubs.includes(routeDef.from) || airline.hubs.includes(routeDef.to)) routeRevenue += 2;
    if (slotState.primary && slotState.secondary && slotState.primary !== slotState.secondary) routeRevenue -= 2;
    
    netRevenue += routeRevenue;
  });

  // Price = (Revenue / 2) + Hub Premium. 
  // This makes profit-heavy carriers much more expensive to founder/acquire.
  const price = Math.floor(netRevenue / 2) + (airline.hubs.length * 5);
  return Math.max(1, price); 
};

// --- RICH ERA DATA (RESTORING FULL CIVILOPEDIA STYLE) ---

const setup1950s = {
  intro: "The decade of the 'regulated peace.' Under the iron-fisted oversight of the Civil Aeronautics Board (CAB), the American sky is not a free market, but a managed utility. Competition on price is illegal; instead, carriers compete on the thickness of their steaks and the frequency of their 'Great Silver Fleet' schedules. It is the era of the 'Grand Trunks,' where the Big Four dominate the map while the 'Chosen Instrument,' Pan Am, carries the American flag to every corner of the globe. But beneath the surface, the invention of the jet engine and the growing middle class are preparing to shatter this gilded age of propellers and linen service.",
  cityDemand: {
    JFK: 4, BOS: 3, ORD: 3, PHI: 2, PIT: 2, DTW: 2,
    ATL: 1, DFW: 1, LAX: 2, SFO: 2, MIA: 2, SEA: 1, STL: 2, MSP: 1,
    CLE: 1, CVG: 1, MSY: 1, MCI: 1, OMA: 1, DEN: 1, PHX: 1, CLT: 1,
  },
  airlines: {
    'American': { 
      id: 'American', name: 'American Airlines', color: '#B0BEC5', treasury: 20, 
      routes: ['R003', 'R031'], hubs: ['JFK'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "Led by the legendary C.R. Smith, American is the titan of the domestic sky. In 1953, they pioneered the 'Mercury' service, the first non-stop transcontinental flight in both directions using the DC-7. While others look to the government for subsidies, Smith focuses on operational scale and the 'SABRE' reservation system—a project with IBM that will eventually revolutionize the industry. American enters the 50s as the standard-bearer for corporate efficiency." 
    },
    'United': { 
      id: 'United', name: 'United Air Lines', color: '#0D47A1', treasury: 20, 
      routes: ['R027', 'R032'], hubs: ['ORD'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "United is the airline of the 'Mainliner'—a brand synonymous with the high-altitude comfort of the post-war boom. Centered in Chicago and San Francisco, United is the chief rival to American for the lucrative transcontinental business traveler. Under Pat Patterson, the airline is a conservative but unstoppable force, investing heavily in the DC-8 jet to ensure it isn't left behind as the piston era ends. They are the backbone of the central and northern corridors." 
    },
    'Delta': { 
      id: 'Delta', name: 'Delta Air Lines', color: '#D32F2F', treasury: 20, 
      routes: ['R017', 'R055'], hubs: ['ATL'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "Born from a crop-dusting operation in Monroe, Louisiana, Delta has transformed into the dominant force of the Deep South. In 1953, they merged with Chicago and Southern Air Lines, finally connecting the Great Lakes to the Gulf of Mexico. Delta is famous for its 'southern hospitality' and a fiercely loyal employee base. They are the first to order the DC-8, signaling their intent to move from a regional power to a national powerhouse centered in the booming Atlanta hub." 
    },
    'PanAm': { 
      id: 'PanAm', name: 'Pan Am', color: '#457B9D', treasury: 20, 
      routes: ['R005', 'R084'], hubs: [], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 2, 
      history: "Juan Trippe's Pan Am is the 'Chosen Instrument' of U.S. foreign policy. It does not fly between U.S. cities; it flies between continents. In 1958, the Pan Am 'Clipper America' (a Boeing 707) will change the world forever by making the first commercial jet flight from New York to Paris. To fly Pan Am is to experience the pinnacle of mid-century prestige, but the airline is entirely dependent on its international monopoly—a monopoly that is starting to draw the ire of domestic rivals." 
    },
    'TWA': { 
      id: 'TWA', name: 'Trans World Airlines', color: '#2A9D8F', treasury: 20, 
      routes: ['R001', 'R064'], hubs: [], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "Owned by the reclusive and mercurial Howard Hughes, TWA is the 'Star of the West.' TWA pushed the boundaries of speed and range with the Lockheed Constellation, a plane Hughes helped design. The airline is locked in a bitter, personal feud with Pan Am for the right to fly international routes, while domestically it holds a hammerlock on the St. Louis-to-LAX corridors. TWA is flashy, technologically advanced, and constantly embroiled in the drama of its owner's eccentricities." 
    },
    'Eastern': { 
      id: 'Eastern', name: 'Eastern Air Lines', color: '#E63946', treasury: 20, 
      routes: ['R004', 'R022'], hubs: ['MIA'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "Under the command of WWI ace Eddie Rickenbacker, Eastern is the 'Great Silver Fleet.' It dominates the East Coast, turning the New York-to-Miami route into a gold mine for sun-seeking vacationers. Rickenbacker runs the airline with military discipline, famously refusing government subsidies and focusing on high-frequency schedules. For most of the 1950s, Eastern is the most profitable airline in the world, proving that leisure travel is the industry's future." 
    },
    'Braniff': { 
      id: 'Braniff', name: 'Braniff International', color: '#E9C46A', treasury: 10, 
      routes: ['R049'], hubs: ['DFW'], sharesOutstanding: 0, isGhost: false, ghostDividendBase: 0, 
      history: "The 'El Dorado' carrier of the Southern Plains. While the Big Four fight over the coasts, Braniff has built an impenetrable fortress in the Texas-to-South America corridor. Known for their flamboyance and the leadership of the Braniff brothers, the airline is the gateway for the oil wealth of Dallas and Houston. They are the scrappy challenger, waiting for the CAB to grant them the routes that will turn them into a national player." 
    },
  }
};

const setup1980s = {
  intro: "The sky is on fire. In 1978, Jimmy Carter signed the Airline Deregulation Act, and 40 years of stability vanished overnight. The CAB is dead, and with it, the government-guaranteed profit. This is the era of 'Darwinian Aviation.' Scrappy newcomers like People Express and Southwest are attacking the giants with low-fare point-to-point routes, while the old guard is desperately building 'Hub-and-Spoke' systems to trap passengers in their networks. Fuel prices are volatile, unions are striking, and the icons of the Golden Age are beginning to starve.",
  cityDemand: {
    JFK: 4, BOS: 2, ORD: 4, ATL: 4, DFW: 4, LAX: 4,
    SFO: 3, MIA: 2, DEN: 3, CLT: 2, SEA: 2, MSP: 2, DTW: 2,
    STL: 3, PIT: 2, CLE: 1, LAS: 2, PHX: 2, IAH: 3,
  },
  airlines: {
    'American': { 
      id: 'American', name: 'American Airlines', color: '#B0BEC5', treasury: 15, 
      routes: ['R031', 'R048', 'R054'], hubs: ['DFW'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "Bob Crandall has taken the helm, and he is a man who loves a fight. Under his leadership, American has invented the modern airline industry: the first yield management system to change prices by the second, the first frequent flyer program (AAdvantage), and a massive fortress hub at Dallas/Fort Worth. American is no longer just an airline; it is a technology and data company that happens to fly planes. They are the architects of the new order." 
    },
    'United': { 
      id: 'United', name: 'United Airlines', color: '#0D47A1', treasury: 15, 
      routes: ['R003', 'R032', 'R075'], hubs: ['ORD'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "United enters the 80s as the largest airline in the non-communist world. They are the kings of Chicago's O'Hare, but the transition to deregulation has been painful. To survive, they are pivoting to the Pacific, acquiring Pan Am's entire Asian route network in a historic $750 million deal. United is the blue-chip giant, stable and powerful, but constantly targeted by a militant pilot's union and aggressive competitors in the Midwest." 
    },
    'Delta': { 
      id: 'Delta', name: 'Delta Air Lines', color: '#D32F2F', treasury: 15, 
      routes: ['R014', 'R017', 'R022'], hubs: ['ATL'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "Delta is the 'Family' airline, famous for its conservative management and the fact that its employees famously bought the company its first Boeing 767 ('The Spirit of Delta') with their own money. They have turned Atlanta into the world's busiest airport, a literal engine of Southern economic growth. In 1987, they merged with Western Airlines to secure the West Coast, becoming a truly national power that operates with quiet, ruthless efficiency." 
    },
    'PanAm': { 
      id: 'PanAm', name: 'Pan Am', color: '#457B9D', treasury: 5, 
      routes: ['R005', 'R076'], hubs: [], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 0, 
      history: "The tragedy of the 80s. Pan Am is a king without a kingdom. Deregulation allowed domestic airlines to fly international, but Pan Am had no domestic routes to feed its 'Clippers.' The acquisition of National Airlines in 1980 was a disastrous, culture-clashing failure. Now, Pan Am is cannibalizing itself—selling its iconic New York building and its Pacific routes just to pay the fuel bills. It is a 'falling knife' for any investor brave enough to catch it." 
    },
    'Northwest': { 
      id: 'Northwest', name: 'Northwest Orient', color: '#880E4F', treasury: 15, 
      routes: ['R027', 'R038'], hubs: ['MSP'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "The specialist of the Great North. Northwest Orient dominates the Minneapolis and Detroit corridors and is the undisputed master of the northern route to Japan and China. Known for a tough, cost-conscious culture (earning them the nickname 'Northwest Territorial'), they are a highly strategic player. They are one of the few legacy carriers with a specialized, high-yield niche that protects them from the worst of the low-fare wars." 
    },
    'Southwest': { 
      id: 'Southwest', name: 'Southwest Airlines', color: '#FDD835', treasury: 20, 
      routes: ['R049', 'R056'], hubs: ['IAH'], sharesOutstanding: 0, isGhost: false, ghostDividendBase: 0, 
      history: "The disruptor from Love Field. Herb Kelleher's airline is a low-fare, no-frills, high-energy machine that flies only Boeing 737s and serves peanuts instead of meals. In the early 80s, Southwest is proving that you don't need a hub-and-spoke system to be profitable. They are the 'anti-airline,' beloved by travelers and feared by the giants who are currently burning millions in fare wars that Southwest is actually winning." 
    },
    'Piedmont': { 
      id: 'Piedmont', name: 'Piedmont Airlines', color: '#1976D2', treasury: 20, 
      routes: ['R009', 'R046'], hubs: ['CLT'], sharesOutstanding: 0, isGhost: false, ghostDividendBase: 0, 
      history: "The 'Best Secret' of the 80s. While others fought for Chicago and Atlanta, Piedmont built a massive, highly efficient hub in Charlotte, North Carolina. By focusing on secondary cities and providing impeccable service, Piedmont became the most profitable regional-turned-major airline in the country. They are the prime takeover target of the decade, a perfectly run gem in a sea of struggling giants." 
    },
  }
};

const setup2000s = {
  intro: "The Age of Survival. The dawn of the new millennium brought the dot-com crash, the 9/11 attacks, and a quadrupling of fuel prices. The industry is in a state of 'Hyper-Consolidation.' One by one, the legendary names—TWA, Northwest, Continental—are realizing that they are too small to survive alone. This is the era of the 'Chapter 11 Shuffle,' where CEOs use bankruptcy courts to shed debt and pensions, and where the goal is no longer growth, but the elimination of redundant capacity through massive, multi-billion dollar mergers.",
  cityDemand: {
    JFK: 4, BOS: 2, ORD: 4, ATL: 4, DFW: 4, LAX: 4,
    SFO: 3, MIA: 3, DEN: 3, CLT: 3, SEA: 2, MSP: 2, DTW: 2,
    PHX: 3, LAS: 3, IAH: 3, MCO: 3, PHI: 3,
  },
  airlines: {
    'American': { 
      id: 'American', name: 'American Airlines', color: '#B0BEC5', treasury: 10, 
      routes: ['R018', 'R031', 'R048', 'R054'], hubs: ['DFW'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "American began the decade by absorbing TWA, but the victory was short-lived. Post-9/11, American found itself with a massive, aging fleet and staggering debt. They avoided the bankruptcies that claimed their rivals, but at the cost of a long, slow decline in service and morale. They remain the king of the Latin American gateway in Miami, but they are increasingly surrounded by more efficient, merged competitors." 
    },
    'United': { 
      id: 'United', name: 'United Airlines', color: '#0D47A1', treasury: 10, 
      routes: ['R003', 'R027', 'R032', 'R075'], hubs: ['ORD'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "United spent nearly three years in Chapter 11 bankruptcy (2002-2006), the largest such filing in history at the time. They emerged leaner, having shed thousands of jobs and their traditional pension plans. Now, United is a predatory survivor, looking for a partner to help them secure their hold on the Midwest and the Pacific. The blue tulip livery is a symbol of a giant that has been to the brink and back." 
    },
    'Delta': { 
      id: 'Delta', name: 'Delta Air Lines', color: '#D32F2F', treasury: 10, 
      routes: ['R004', 'R014', 'R016', 'R017'], hubs: ['ATL'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "Delta's 2008 merger with Northwest Orient changed everything. By successfully integrating a rival with a complementary route network, Delta became the template for the 'Mega-Carrier.' They transformed from a struggling Southern airline into a global powerhouse. Their hub at Atlanta is now a city unto itself, and their ability to generate cash while others bleed makes them the most dangerous player in the consolidation game." 
    },
    'Continental': { 
      id: 'Continental', name: 'Continental Airlines', color: '#C8960C', treasury: 15, 
      routes: ['R048', 'R082'], hubs: ['IAH'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "The 'Clean' legacy. Continental survived multiple bankruptcies in the 80s and 90s to emerge as the most polished and reliable major carrier of the 2000s. Under Jeff Smisek, they have built a powerhouse hub in Houston and a premium gateway at Newark. They are the 'belle of the ball,' a highly efficient airline that every other major carrier wants to merge with to secure their own survival." 
    },
    'Northwest': { 
      id: 'Northwest', name: 'Northwest Airlines', color: '#880E4F', treasury: 10, 
      routes: ['R027', 'R038'], hubs: ['MSP'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "The final years of the 'Red Tails.' Northwest entered the 2000s as a specialist in trans-Pacific travel, but high fuel and low-cost competition in their domestic hubs forced them into bankruptcy in 2005. Their merger with Delta is the first of the modern mega-mergers, providing the Asian gateways that Delta lacked. Northwest is a strategic prize of the highest order, but its time as an independent name is ending." 
    },
    'Southwest': { 
      id: 'Southwest', name: 'Southwest Airlines', color: '#FDD835', treasury: 25, 
      routes: ['R049', 'R051', 'R056'], hubs: ['PHX'], sharesOutstanding: 0, isGhost: false, ghostDividendBase: 0, 
      history: "The winner of the chaos. While the legacy carriers were in bankruptcy court, Southwest was expanding into their territories. Using their legendary fuel-hedging strategy, Southwest paid half as much for gas as its rivals for years. They are no longer a Texas specialist; they are a national powerhouse that dictates the pricing of the entire industry. They are the only major carrier to remain consistently profitable through the decade's crises." 
    },
    'USAirways': { 
      id: 'USAirways', name: 'US Airways', color: '#263238', treasury: 10, 
      routes: ['R002', 'R009', 'R046'], hubs: ['PHI'], sharesOutstanding: 0, isGhost: false, ghostDividendBase: 0, 
      history: "The 'Cat with Nine Lives.' US Airways filed for bankruptcy twice in three years before being acquired by America West in 2005. Despite their struggles, they hold essential hubs in Philadelphia and Charlotte. Led by Doug Parker, they are the 'Consolidation Junkies,' realizing that their only path to victory is to keep merging until they are one of the last few standing. They are the wild card of the merger mania." 
    },
  }
};

const setup2026 = {
  intro: "The Post-Pandemic Pivot. 2026 sees the world fully recovered but fundamentally changed. The DOJ's block of the Spirit/JetBlue merger has sent the ULCC market into a tailspin, while the Big Three have doubled down on 'Premium Leisure.' American is drowning in debt, United is betting billions on its 'Next' strategy, and Delta is printing money through its Amex partnership. Business travel is gone, but the Sunbelt is booming.",
  cityDemand: {
    ATL: 5, DFW: 4, DEN: 4, ORD: 3, LAX: 4, JFK: 3,
    CLT: 3, LAS: 3, PHX: 3, MCO: 2, IAH: 3, MIA: 2,
    SEA: 2, SFO: 2, BNA: 2, SAN: 2, TPA: 2, AUS: 2,
  },
  airlines: {
    'American': { 
      id: 'American', name: 'American Airlines', color: '#B0BEC5', treasury: 10, 
      routes: ['R018', 'R031', 'R048', 'R053'], hubs: ['DFW'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "American enters 2026 following a decade of identity crisis. Having doubled down on its Sunbelt fortresses at Dallas/Fort Worth and Charlotte, the airline has positioned itself as the carrier of the American interior. However, with interest rates remaining high and its fleet modernization trailing United, American is fighting a war of attrition. Its strategy is simple: dominance through sheer volume. But as fuel prices spike and premium leisure travelers drift toward Delta, American's thin margins leave it with little room for error." 
    },
    'United': { 
      id: 'United', name: 'United Airlines', color: '#0D47A1', treasury: 15, 
      routes: ['R003', 'R027', 'R032', 'R075'], hubs: ['ORD', 'DEN'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "Under the aggressive leadership of Scott Kirby, United has enacted 'United Next'—a multi-billion dollar bet on a premium-heavy, wide-body future. By 2026, United has transformed its hubs in Newark, Chicago, and San Francisco into global gateways that cater to the high-yield international traveler. While rivals focus on domestic leisure, United has pivoted to the Pacific and Atlantic, betting that the rise of the global middle class will outweigh domestic volatility. They are no longer just an airline; they are a high-speed logistics machine for the 21st-century globalist." 
    },
    'Delta': { 
      id: 'Delta', name: 'Delta Air Lines', color: '#D32F2F', treasury: 20, 
      routes: ['R014', 'R016', 'R017', 'R022'], hubs: ['ATL', 'DTW'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "Delta remains the undisputed aristocrat of the industry. By 2026, its partnership with American Express has evolved into a financial engine that rivals its actual flying operations in profitability. Delta doesn't just sell flights; it sells a brand of reliability and exclusivity. Anchored by the world's most efficient hub in Atlanta, Delta has successfully segmented the market, using 'Basic Economy' to fend off Frontier while keeping its 'Delta One' cabins full of high-spending vacationers. They are the most cash-rich player on the board." 
    },
    'Southwest': { 
      id: 'Southwest', name: 'Southwest Airlines', color: '#FDD835', treasury: 20, 
      routes: ['R049', 'R051', 'R056'], hubs: ['PHX'], sharesOutstanding: 5, isGhost: true, ghostDividendBase: 1, 
      history: "The 2020s have been a decade of reckoning for the house that Herb built. Following the catastrophic system meltdown of 2022 and mounting pressure from activist investors, Southwest in 2026 is an airline in transition. The iconic 'open seating' is gone, replaced by assigned seats and premium cabins. While it remains the king of point-to-point travel, Southwest is now forced to compete on the legacies' terms. Its legendary culture is being tested by the need for massive technological overhauls and a shift away from its pure LCC roots." 
    },
    'JetBlue': { 
      id: 'JetBlue', name: 'JetBlue', color: '#0277BD', treasury: 10, 
      routes: ['R001', 'R002'], hubs: ['JFK'], sharesOutstanding: 0, isGhost: false, ghostDividendBase: 0, 
      history: "Left at the altar by Spirit and forced out of its Northeast Alliance with American, JetBlue enters 2026 searching for a new soul. Under its 'JetForward' program, the airline has abandoned its money-losing secondary routes to refocus on its bread and butter: the high-demand transcontinental 'Mint' service and its fortress at JFK. JetBlue remains the darling of the sophisticated leisure traveler, but its lack of scale in a world of mega-carriers makes it a fragile player. It is the board's most strategic 'swing' carrier." 
    },
    'Alaska': { 
      id: 'Alaska', name: 'Alaska Airlines', color: '#00695C', treasury: 15, 
      routes: ['R076', 'R080'], hubs: ['SEA'], sharesOutstanding: 0, isGhost: false, ghostDividendBase: 0, 
      history: "The 'West Coast Fortress' has completed its integration of Hawaiian Airlines, creating a Pacific powerhouse that stretches from the Arctic to Honolulu. Alaska has mastered the art of the 'High-Yield Regional' carrier, fending off Delta's incursions into Seattle through fierce local loyalty and superior operational performance. By 2026, Alaska is a model of disciplined growth, maintaining the industry's best balance sheet while refusing to be drawn into the low-fare bloodbaths of the Sunbelt. They are the defensive specialist of the board." 
    },
    'Frontier': { 
      id: 'Frontier', name: 'Frontier Airlines', color: '#2E7D32', treasury: 10, 
      routes: ['R053', 'R065'], hubs: ['DEN'], sharesOutstanding: 0, isGhost: false, ghostDividendBase: 0, 
      history: "Following the collapse of the Spirit merger and the subsequent chaos in the ULCC sector, Frontier has emerged as the 'Last Man Standing' of the ultra-low-cost model. By 2026, Frontier has pivoted to a 'Simplified' network, focusing on high-frequency out-and-back flights from its Denver and Orlando hubs. Their strategy is a brutal war on costs—eliminating every possible friction point to offer fares that the Big Three cannot match. Frontier is the board's primary disruptor, designed to thrive in the low-yield environment." 
    },
  }
};

export const getInitialState = (era: string, players: Player[]): GameState => {
  let setup = setup1950s;
  let fuelPrice = 2;
  
  if (era === '1980s') {
    setup = setup1980s;
    fuelPrice = 3;
  } else if (era === '2000s') {
    setup = setup2000s;
    fuelPrice = 4;
  } else if (era === '2026') {
    setup = setup2026;
    fuelPrice = 5;
  }

  const routeState = createBaseRouteState();
  
  // High saturation starting states to trigger immediate Fare Wars (-$2)
  if (era === '2026') {
    routeState['R018'] = { primary: 'American', secondary: 'Delta' }; // DFW-ATL
    routeState['R031'] = { primary: 'American', secondary: 'United' }; // DFW-ORD
    routeState['R053'] = { primary: 'American', secondary: 'Frontier' }; // DFW-DEN
    routeState['R017'] = { primary: 'Delta', secondary: 'United' }; // ATL-ORD
    routeState['R014'] = { primary: 'Delta', secondary: 'American' }; // ATL-CLT
    routeState['R049'] = { primary: 'Southwest', secondary: 'American' }; // DFW-SAT
  } else if (era === '2000s') {
    routeState['R031'] = { primary: 'American', secondary: 'United' }; 
    routeState['R017'] = { primary: 'Delta', secondary: 'American' };
    routeState['R048'] = { primary: 'American', secondary: 'Continental' };
  } else if (era === '1980s') {
    routeState['R003'] = { primary: 'American', secondary: 'United' };
    routeState['R017'] = { primary: 'United', secondary: 'Delta' };
  }

  const airlines: Record<string, Airline> = {};
  Object.entries(setup.airlines).forEach(([id, a]) => {
    // Initial Stock Price based on starting network
    const price = computeStockPrice(a, { routeState, cityDemand: setup.cityDemand });
    airlines[id] = { ...a, stockPrice: price };
  });

  Object.values(airlines).forEach(a => {
    a.routes.forEach(rId => {
      if (routeState[rId]) {
        if (!routeState[rId].primary) routeState[rId].primary = a.id;
        else if (!routeState[rId].secondary && routeState[rId].primary !== a.id) routeState[rId].secondary = a.id;
      }
    });
  });

  return {
    players,
    airlines,
    routeState,
    cityDemand: setup.cityDemand,
    fuelPrice,
    currentPhase: 'STOCK_MARKET',
    currentPlayerIndex: 0,
    currentAirlineIndex: 0,
    round: 1,
    activeMA: null,
    gameLog: [],
    passedPlayers: [],
    currentEvent: null,
    showIntro: true,
    eraIntro: setup.intro
  };
};

export const initialState = getInitialState('1950s', [
  { id: 'P1', name: 'Player 1', cash: 40, holdings: {}, isAI: false }
]);