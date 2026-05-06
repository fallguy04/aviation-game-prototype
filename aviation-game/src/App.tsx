import React, { useReducer, useState, useMemo, useEffect } from 'react';
import MapComponent from './MapComponent';
import { initialState } from './data/initialState';
import { ROUTES } from './data/routeData';
import { gameReducer } from './store/gameReducer';
import { getAIAction } from './ai/aiAgent';
import { Airline, GameState, Player } from './types/GameTypes';

const AIRLINE_CODES: Record<string, string> = {
  Continental: 'CO', Eastern: 'EA', PanAm: 'PA', TWA: 'TW', Braniff: 'BN', Northeast: 'NE',
  Southwest: 'WN', Piedmont: 'PI', American: 'AA', United: 'UA', Delta: 'DL', JetBlue: 'B6', Spirit: 'NK', Alaska: 'AS', Frontier: 'F9',
  Northwest: 'NW', USAirways: 'US'
};

const getContrastColor = (hexcolor: string) => {
  if (!hexcolor || hexcolor.length < 6) return 'white';
  const r = parseInt(hexcolor.slice(1, 3), 16);
  const g = parseInt(hexcolor.slice(3, 5), 16);
  const b = parseInt(hexcolor.slice(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? 'black' : 'white';
};

const calculateProjectedExpenses = (airline: Airline, fuelPrice: number): number => {
  const fuelCost = airline.routes.length * fuelPrice;
  let hubTax = 0;
  airline.hubs.forEach((_, i) => hubTax += (i === 0 ? 6 : i === 1 ? 8 : 12));
  return fuelCost + hubTax;
};

const CollapsibleSection = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: '8px', overflow: 'hidden' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: isOpen ? '#E8EAF6' : '#FFFFFF',
          color: '#1A237E',
          padding: '10px 14px',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '1.5px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          transition: 'all 0.2s'
        }}
      >
        {title}
        <span>{isOpen ? '▼' : '▶'}</span>
      </div>
      <div style={{ maxHeight: isOpen ? '1500px' : '0', opacity: isOpen ? 1 : 0, overflow: 'hidden', transition: 'all 0.3s', padding: isOpen ? '8px 4px' : '0 4px' }}>
        {children}
      </div>
    </div>
  );
};

const EraSelectScreen = ({ onStart }: { onStart: (era: string, names: string[], aiFlags: boolean[]) => void }) => {
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState(3);
  const [playerNames, setPlayerNames] = useState<string[]>(['Player 1', 'AI Bot 1', 'AI Bot 2', 'AI Bot 3', 'AI Bot 4', 'AI Bot 5']);
  const [playerTypes, setPlayerTypes] = useState<boolean[]>([false, true, true, true, true, true]); // true = AI

  const updateNamesSequentially = (currentTypes: boolean[]) => {
    let humanCount = 0;
    let aiCount = 0;
    const newNames = playerNames.map((name, i) => {
      const isDefault = name.startsWith('Player ') || name.startsWith('AI Bot ');
      if (!isDefault) return name;
      if (currentTypes[i]) {
        aiCount++;
        return `AI Bot ${aiCount}`;
      } else {
        humanCount++;
        return `Player ${humanCount}`;
      }
    });
    setPlayerNames(newNames);
  };

  const togglePlayerType = (i: number) => {
    const pt = [...playerTypes];
    pt[i] = !pt[i];
    setPlayerTypes(pt);
    updateNamesSequentially(pt);
  };

  const eras = [
    { id: '1950s', name: '1950s GOLDEN AGE', icon: '✈', subtitle: 'Dawn of Aviation', desc: 'High demand, low fuel. Large ghost fleets offer lucrative dividends. Expansionist and optimistic.', difficulty: 'BEGINNER', diffColor: '#2E7D32', players: '2-4 rec' },
    { id: '1980s', name: '1980s DEREGULATION', icon: '⚡', subtitle: 'Chaos on Tarmac', desc: 'Volatile fuel prices. Endemic fare wars.', difficulty: 'ADVANCED', diffColor: '#EF6C00', players: '3-5 rec' },
    { id: '2000s', name: '2000s MERGER MANIA', icon: '🏦', subtitle: 'Age of Mergers', desc: 'Concentrated markets. M&A is dominant strategy.', difficulty: 'EXPERT', diffColor: '#C62828', players: '3-4 rec' },
    { id: '2026', name: '2026 POST-MERGER', icon: '🚀', subtitle: 'Turbulence Ahead', desc: 'Spirit has collapsed. High fuel and massive debt challenge the Big Three. Sunbelt hubs dominate.', difficulty: 'ELITE', diffColor: '#7B1FA2', players: '4-6 rec' }
    ];

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#F0F4F8', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ padding: '20px 40px', background: 'white', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ color: '#1A237E', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px' }}>[WORKING TITLE]</div>
        <div style={{ color: '#546E7A', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Session Setup</div>
      </header>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '60px 20px' }}>
        <div style={{ maxWidth: '900px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ color: '#1A237E', fontSize: '32px', fontWeight: 900 }}>Select Your Era</h2>
            <p style={{ color: '#546E7A', fontSize: '16px' }}>Choose a historical scenario to begin</p>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '48px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {eras.map(era => (
              <div key={era.id} onClick={() => setSelectedEra(era.id)} style={{ flex: '1 1 260px', minHeight: '360px', background: selectedEra === era.id ? '#E8EAF6' : 'white', border: selectedEra === era.id ? '2px solid #1A237E' : '1px solid #E2E8F0', borderRadius: '20px', padding: '32px', cursor: 'pointer', transition: 'all 0.3s', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: selectedEra === era.id ? '0 20px 40px rgba(26, 35, 126, 0.15)' : '0 4px 12px rgba(0,0,0,0.03)', transform: selectedEra === era.id ? 'translateY(-8px)' : 'none' }}>
                <div style={{ fontSize: '56px', marginBottom: '20px' }}>{era.icon}</div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#1A237E' }}>{era.name}</h3>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#546E7A', textTransform: 'uppercase' }}>{era.subtitle}</p>
                <p style={{ fontSize: '13px', color: '#37474F', lineHeight: '1.6', margin: '20px 0', textAlign: 'center' }}>{era.desc}</p>
                <div style={{ marginTop: 'auto' }}><span style={{ fontSize: '10px', fontWeight: 900, color: era.diffColor, background: era.diffColor + '12', padding: '4px 12px', borderRadius: '20px' }}>{era.difficulty}</span></div>
              </div>
            ))}
          </div>
          {selectedEra && (
            <div style={{ background: 'white', padding: '40px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', animation: 'slideUp 0.4s ease-out' }}>
              <label style={{ fontSize: '11px', fontWeight: 900, color: '#546E7A', letterSpacing: '1.5px' }}>NUMBER OF PLAYERS</label>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '16px 0 32px' }}>
                {[2, 3, 4, 5, 6].map(n => <button key={n} onClick={() => setPlayerCount(n)} style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid', borderColor: playerCount === n ? '#1A237E' : '#CFD8DC', background: playerCount === n ? '#1A237E' : 'white', color: playerCount === n ? 'white' : '#546E7A', cursor: 'pointer', fontWeight: 900 }}>{n}</button>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                {Array.from({ length: playerCount }).map((_, i) => (
                  <div key={i} style={{ background: '#F8F9FA', padding: '16px', borderRadius: '16px', border: '1px solid #ECEFF1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 800, color: '#90A4AE' }}>POSITION {i+1}</label>
                      <button onClick={() => togglePlayerType(i)} style={{ background: playerTypes[i] ? '#EF6C00' : '#1A237E', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', fontWeight: 900, cursor: 'pointer' }}>{playerTypes[i] ? 'AI BOT' : 'HUMAN'}</button>
                    </div>
                    <input value={playerNames[i]} onChange={(e) => { const n = [...playerNames]; n[i] = e.target.value; setPlayerNames(n); }} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '2px solid #E0E0E0', fontSize: '14px', fontWeight: 600, outline: 'none' }} />
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center' }}><button onClick={() => onStart(selectedEra, playerNames.slice(0, playerCount), playerTypes.slice(0, playerCount))} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '12px', padding: '18px 80px', fontSize: '18px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 24px rgba(26, 35, 126, 0.3)' }}>BEGIN {selectedEra.toUpperCase()}</button></div>
            </div>
          )}
        </div>
      </div>
      <footer style={{ padding: '16px 40px', background: 'white', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ color: '#90A4AE', fontSize: '10px', fontWeight: 700 }}>VERSION 1.0.5 | PROTOTYPE</div>
        <div style={{ color: '#90A4AE', fontSize: '10px', fontWeight: 700 }}>© 2026 AVIATION CORPORATE STRATEGY</div>
      </footer>
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [selectedAirlineId, setSelectedAirlineId] = useState<string>('Continental');
  const [divAmount, setDivAmount] = useState<number>(1);
  const [targetAirlineId, setTargetAirlineId] = useState<string>('');

  const currentPlayer = state.players[state.currentPlayerIndex] || state.players[0];
  const airlineList = Object.values(state.airlines);
  const currentAirline = airlineList[state.currentAirlineIndex] || airlineList[0];
  const activeCEOAirline = useMemo(() => airlineList.find(a => a.ceoPlayerId === currentPlayer.id), [airlineList, currentPlayer.id]);

  useEffect(() => {
    if (!gameStarted || state.currentEvent || state.showIntro) return;
    if (currentPlayer && currentPlayer.isAI) {
      const timer = setTimeout(() => {
        const action = getAIAction(state, currentPlayer);
        dispatch(action);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameStarted, state.currentPlayerIndex, state.currentPhase, state, currentPlayer]);

const IntroModal = ({ state, dispatch }: { state: GameState, dispatch: React.Dispatch<any> }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const airlineList = Object.values(state.airlines);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
      <div style={{ 
        background: '#F4F1EA', 
        border: '8px double #4A4A4A', 
        borderRadius: '4px', 
        width: '95%', 
        maxWidth: '1000px', 
        height: '85vh', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        boxShadow: '0 50px 100px rgba(0,0,0,0.8)',
        fontFamily: '"Georgia", serif',
        color: '#2C2C2C'
      }}>
        {/* TOP HEADER - OFFICIAL BRIEFING STYLE */}
        <div style={{ padding: '30px 48px', borderBottom: '2px solid #4A4A4A', background: '#E9E4D9', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '3px', color: '#5D5D5D', marginBottom: '4px' }}>DEPARTMENT OF STRATEGIC OVERSIGHT</div>
            <h1 style={{ fontSize: '32px', fontWeight: 900, margin: 0, letterSpacing: '-1px', color: '#1A1A1A' }}>HISTORICAL INTELLIGENCE BRIEFING</h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 900 }}>CLASSIFICATION: <span style={{ color: '#B71C1C' }}>RESTRICTED</span></div>
            <div style={{ fontSize: '12px' }}>DATE: MAY 1955</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* LEFT TABS - FOLDER STYLE */}
          <div style={{ width: '220px', background: '#DFD9CD', borderRight: '2px solid #4A4A4A', overflowY: 'auto', padding: '20px 0' }}>
            <div 
              onClick={() => setActiveTab('summary')}
              style={{ 
                padding: '16px 24px', 
                cursor: 'pointer', 
                fontSize: '13px', 
                fontWeight: 900, 
                letterSpacing: '1px',
                background: activeTab === 'summary' ? '#F4F1EA' : 'transparent',
                borderLeft: activeTab === 'summary' ? '8px solid #1A237E' : 'none',
                color: activeTab === 'summary' ? '#1A1A1A' : '#5D5D5D',
                marginBottom: '4px'
              }}
            >
              MISSION SUMMARY
            </div>
            <div style={{ padding: '10px 24px', fontSize: '10px', fontWeight: 900, color: '#8D8D8D', letterSpacing: '2px', borderBottom: '1px solid #C0B7A6', margin: '10px 0' }}>ACTIVE CARRIERS</div>
            {airlineList.map(a => (
              <div 
                key={a.id}
                onClick={() => setActiveTab(a.id)}
                style={{ 
                  padding: '12px 24px', 
                  cursor: 'pointer', 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  background: activeTab === a.id ? '#F4F1EA' : 'transparent',
                  borderLeft: activeTab === a.id ? `8px solid ${a.color}` : 'none',
                  color: activeTab === a.id ? '#1A1A1A' : '#5D5D5D',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: a.color }} />
                {a.name.toUpperCase()}
              </div>
            ))}
          </div>
          
          {/* MAIN CONTENT AREA - DOCUMENT STYLE */}
          <div style={{ flex: 1, padding: '60px 80px', overflowY: 'auto', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '20px', right: '40px', opacity: 0.1, pointerEvents: 'none' }}>
              <div style={{ border: '4px solid #B71C1C', color: '#B71C1C', padding: '10px 20px', fontSize: '32px', fontWeight: 900, transform: 'rotate(-15deg)' }}>APPROVED</div>
            </div>

            {activeTab === 'summary' ? (
              <div style={{ maxWidth: '650px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 900, borderBottom: '1px solid #1A1A1A', paddingBottom: '10px', marginBottom: '24px' }}>OPERATIONAL THEATER</h2>
                <p style={{ fontSize: '17px', lineHeight: '1.8', marginBottom: '40px', textAlign: 'justify' }}>{state.eraIntro}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                  <div style={{ border: '1px solid #4A4A4A', padding: '24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#5D5D5D', marginBottom: '12px', letterSpacing: '1px' }}>LOGISTICS PROFILE</div>
                    <div style={{ fontSize: '28px', fontWeight: 900 }}>${state.fuelPrice} <span style={{ fontSize: '14px', fontWeight: 400 }}>/ SEGMENT</span></div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Current Fuel Expenditure Rate</div>
                  </div>
                  <div style={{ border: '1px solid #4A4A4A', padding: '24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#5D5D5D', marginBottom: '12px', letterSpacing: '1px' }}>ORDER OF BATTLE</div>
                    <div style={{ fontSize: '28px', fontWeight: 900 }}>{airlineList.length} <span style={{ fontSize: '14px', fontWeight: 400 }}>TOTAL</span></div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Identified Major Competitors</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: '650px' }}>
                {airlineList.filter(a => a.id === activeTab).map(a => (
                  <div key={a.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
                      <div style={{ width: '64px', height: '64px', border: '2px solid #1A1A1A', background: a.color, display: 'flex', justifyContent: 'center', alignItems: 'center', color: getContrastColor(a.color), fontWeight: 900, fontSize: '24px', boxShadow: '4px 4px 0 #4A4A4A' }}>
                        {AIRLINE_CODES[a.id] || a.id.substring(0, 2).toUpperCase()}
                      </div>
                      <h2 style={{ fontSize: '36px', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>{a.name}</h2>
                    </div>
                    
                    <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#5D5D5D', letterSpacing: '2px', borderBottom: '1px solid #C0B7A6', paddingBottom: '4px', marginBottom: '20px' }}>HISTORICAL DOSSIER</h3>
                    <p style={{ fontSize: '17px', lineHeight: '1.8', marginBottom: '48px', textAlign: 'justify' }}>{a.history}</p>
                    
                    <div style={{ background: '#E9E4D9', border: '1px solid #4A4A4A', padding: '32px' }}>
                      <h3 style={{ fontSize: '11px', fontWeight: 900, color: '#5D5D5D', marginBottom: '20px', letterSpacing: '2px', textAlign: 'center' }}>FIELD INTELLIGENCE - STARTING ASSETS</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #4A4A4A', paddingTop: '20px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '32px', fontWeight: 900 }}>{a.routes.length}</div>
                          <div style={{ fontSize: '11px', fontWeight: 900, color: '#5D5D5D' }}>SECTORS</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '32px', fontWeight: 900 }}>{a.hubs.length}</div>
                          <div style={{ fontSize: '11px', fontWeight: 900, color: '#5D5D5D' }}>OPERATIONS</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '32px', fontWeight: 900 }}>${a.stockPrice}</div>
                          <div style={{ fontSize: '11px', fontWeight: 900, color: '#5D5D5D' }}>MARKET CAP</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div style={{ padding: '30px 48px', borderTop: '2px solid #4A4A4A', textAlign: 'right', background: '#E9E4D9' }}>
          <button 
            onClick={() => dispatch({ type: 'DISMISS_INTRO' })}
            style={{ 
              background: '#1A1A1A', 
              color: '#F4F1EA', 
              border: 'none', 
              borderRadius: '2px', 
              padding: '18px 80px', 
              fontSize: '14px', 
              fontWeight: 900, 
              cursor: 'pointer', 
              letterSpacing: '2px',
              boxShadow: '4px 4px 0 #5D5D5D',
              fontFamily: '"Georgia", serif'
            }}
          >
            AUTHORIZE MISSION START
          </button>
        </div>
      </div>
    </div>
  );
};

  const handleStartGame = (era: string, names: string[], aiFlags: boolean[]) => {
    const newPlayers = names.map((name, i) => ({ id: `P${i + 1}`, name, cash: 40, holdings: {}, isAI: aiFlags[i] }));
    dispatch({ type: 'START_GAME', payload: { players: newPlayers, era } });
    setGameStarted(true);
  };

  const handleSlotClick = (routeId: string, slot: 'primary' | 'secondary') => {
    if (state.currentPhase !== 'PLAN_ROUTES' || !activeCEOAirline || currentPlayer.isAI) return;
    const currentSlots = state.routeState[routeId];
    const current = currentSlots?.[slot];
    
    if (current === activeCEOAirline.id) {
      dispatch({ type: 'REMOVE_ROUTE', payload: { airlineId: activeCEOAirline.id, routeId, slot } });
    } else if (!current) {
      // Check if they already own the OTHER slot
      if (currentSlots && (currentSlots.primary === activeCEOAirline.id || currentSlots.secondary === activeCEOAirline.id)) {
        alert("You already have a presence on this route. One airline per route line.");
        return;
      }
      dispatch({ type: 'PLACE_ROUTE', payload: { airlineId: activeCEOAirline.id, routeId, slot } });
    } else alert("Occupied.");
  };

  const handleBuy = () => {
    if (currentPlayer.isAI) return;
    const a = state.airlines[selectedAirlineId];
    if (!a || a.stockPrice <= 0) return;
    if (currentPlayer.cash < a.stockPrice) { alert("No cash."); return; }
    dispatch({ type: 'BUY_STOCK', payload: { airlineId: selectedAirlineId, playerId: currentPlayer.id, shares: 1 } });
  };

  const handleSell = () => {
    if (currentPlayer.isAI) return;
    if ((currentPlayer.holdings[selectedAirlineId] || 0) < 1) { alert("No shares."); return; }
    dispatch({ type: 'SELL_STOCK', payload: { airlineId: selectedAirlineId, playerId: currentPlayer.id, shares: 1 } });
  };

  const handleHub = (cityId: string) => {
    if (state.currentPhase !== 'PLAN_ROUTES' || !activeCEOAirline || currentPlayer.isAI) return;
    if (airlineList.some(a => a.hubs.includes(cityId))) { alert("Hub exists."); return; }
    if (activeCEOAirline.treasury < 15) { alert("No funds."); return; }
    if (window.confirm(`Build hub in ${cityId} for $15?`)) {
      dispatch({ type: 'BUILD_HUB', payload: { airlineId: activeCEOAirline.id, cityId } });
    }
  };

  const handleMA = () => {
    if (state.currentPhase !== 'PLAN_ROUTES' || !activeCEOAirline || !targetAirlineId) return;
    dispatch({ type: 'DECLARE_MA', payload: { attackingAirlineId: activeCEOAirline.id, targetAirlineId } });
  };

  const togglePanel = (p: string) => setActivePanel(activePanel === p ? null : p);

  if (!gameStarted) return <EraSelectScreen onStart={handleStartGame} />;

  const portfolioValue = Object.entries(currentPlayer.holdings).reduce((acc, [aid, count]) => acc + (state.airlines[aid]?.stockPrice || 0) * count, 0);
  const isCorporatePhase = ['PLAN_ROUTES', 'DIVIDENDS', 'COLLECT_REVENUE', 'PAY_EXPENSES'].includes(state.currentPhase);
  const activeLabel = isCorporatePhase ? `Airline: ${currentAirline.name}` : `Player: ${currentPlayer.name}`;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', inset: 0, overflow: 'hidden', background: '#F0F4F8', color: '#37474F', fontFamily: 'Arial, sans-serif' }}>
      
      <MapComponent 
        routeState={state.routeState} cityDemand={state.cityDemand} 
        onSlotClick={handleSlotClick} onCityClick={handleHub} 
        airlineColors={Object.fromEntries(airlineList.map(a => [a.id, a.color]))} 
        airlineHubs={Object.fromEntries(airlineList.map(a => [a.id, a.hubs]))}
        activeAirlineId={activeCEOAirline?.id || null} isPlanning={state.currentPhase === 'PLAN_ROUTES'}
      />

      {state.showIntro && <IntroModal state={state} dispatch={dispatch} />}

      {/* TOP LEFT - Dynamic Operational HUD */}
      <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 100, background: 'rgba(255,255,255,0.92)', border: '0.5px solid #B0BEC5', borderRadius: '12px', padding: '10px 14px', minWidth: '180px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        {isCorporatePhase && activeCEOAirline ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: activeCEOAirline.color }} />
              <div style={{ fontWeight: 900, fontSize: '13px', color: '#1A237E' }}>{activeCEOAirline.name} OPS</div>
            </div>
            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Treasury:</span><span style={{ fontWeight: 800 }}>${activeCEOAirline.treasury}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Routes:</span><span style={{ fontWeight: 800 }}>{activeCEOAirline.routes.length}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '0.5px solid #E0E0E0', marginTop: '4px', paddingTop: '4px' }}><span>Est. Expenses:</span><span style={{ fontWeight: 800, color: '#B71C1C' }}>-${calculateProjectedExpenses(activeCEOAirline, state.fuelPrice)}</span></div>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '6px', color: '#1A237E' }}>{currentPlayer.name} {currentPlayer.isAI ? '(AI)' : ''}</div>
            <div style={{ fontSize: '11px' }}>Cash: <span style={{ color: '#1B5E20', fontWeight: 800 }}>${currentPlayer.cash}</span></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', margin: '4px 0' }}>
              {Object.entries(currentPlayer.holdings).filter(([_, c]) => c > 0).map(([aid, c]) => (
                 <div key={aid} style={{ background: `${state.airlines[aid]?.color}40`, color: state.airlines[aid]?.color, borderRadius: '8px', padding: '1px 6px', fontSize: '9px', fontWeight: 900 }}>{AIRLINE_CODES[aid]} x{c}</div>
              ))}
            </div>
            <div style={{ fontSize: '11px' }}>Net Worth: <span style={{ color: '#1A237E', fontWeight: 800 }}>${currentPlayer.cash + portfolioValue}</span></div>
          </>
        )}
      </div>

      {/* TOP CENTER - Phase Bar */}
      <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'rgba(255,255,255,0.92)', border: '0.5px solid #B0BEC5', borderRadius: '20px', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ background: '#1A237E', color: 'white', borderRadius: '10px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '1px' }}>{state.currentPhase.replace('_', ' ')}</div>
        <div style={{ width: '1px', height: '16px', background: '#E0E0E0' }} />
        <div style={{ fontSize: '12px' }}>RD {state.round}</div>
        <div style={{ width: '1px', height: '16px', background: '#E0E0E0' }} />
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1A237E' }}>{activeLabel}</div>
        <div style={{ width: '1px', height: '16px', background: '#E0E0E0' }} />
        <div style={{ fontSize: '12px' }}>Fuel <span style={{ fontWeight: 'bold', color: '#E65100' }}>${state.fuelPrice}</span></div>
      </div>

      {/* RIGHT EDGE - Icon Strip */}
      <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 100 }}>
        {[
          { id: 'airlines', icon: '✈', label: airlineList.length, color: '#546E7A' },
          { id: 'players', icon: '👥', label: state.players.length, color: '#546E7A' },
          { id: 'stock', icon: '📈', label: 'STK', color: '#E65100' },
          { id: 'log', icon: '📋', label: 'LOG', color: '#1B5E20' }
        ].map(btn => (
          <div key={btn.id} onClick={() => togglePanel(btn.id)} style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.92)', border: '0.5px solid #B0BEC5', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <span style={{ fontSize: '16px' }}>{btn.icon}</span>
            <span style={{ fontSize: '9px', fontWeight: 'bold', color: btn.color }}>{btn.label}</span>
            {activePanel === btn.id && (
              <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: '56px', top: '50%', transform: 'translateY(-50%)', width: btn.id === 'airlines' ? '500px' : '240px', background: 'rgba(255,255,255,0.96)', border: '0.5px solid #B0BEC5', borderRadius: '10px', padding: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '85vh', overflowY: 'auto', cursor: 'default' }}>
                <CollapsibleSection title={btn.id.toUpperCase()}>
                  <div style={{ display: btn.id === 'airlines' ? 'grid' : 'block', gridTemplateColumns: btn.id === 'airlines' ? '1fr 1fr' : 'none', gap: '8px' }}>
                    {btn.id === 'airlines' && airlineList.map(a => {
                      const revenue = Object.entries(state.routeState).reduce((acc, [routeId, slotState]) => {
                        const routeDef = ROUTES.find(r => r.id === routeId);
                        if (!routeDef || (slotState.primary !== a.id && slotState.secondary !== a.id)) return acc;
                        
                        let routeRev = (state.cityDemand[routeDef.from] ?? 1) + (state.cityDemand[routeDef.to] ?? 1);
                        if (a.hubs.includes(routeDef.from) || a.hubs.includes(routeDef.to)) routeRev += 2;
                        if (slotState.primary && slotState.secondary && slotState.primary !== slotState.secondary) routeRev -= 2;
                        
                        let count = 0;
                        if (slotState.primary === a.id) count++;
                        if (slotState.secondary === a.id) count++;
                        
                        return acc + (routeRev * count);
                      }, 0);
                      const expenses = calculateProjectedExpenses(a, state.fuelPrice);
                      const profit = revenue - expenses;

                      return (
                        <div key={a.id} style={{ borderLeft: `3px solid ${a.color}`, paddingLeft: '8px', background: '#F5F8FA', borderRadius: '4px', padding: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '11px' }}>
                            <span>{a.name}</span>
                            <span style={{ color: '#E65100' }}>${a.stockPrice}</span>
                          </div>
                          <div style={{ fontSize: '10px', marginTop: '4px' }}>
                            Tr: ${a.treasury} | Hubs: {a.hubs.length}
                          </div>
                          <div style={{ fontSize: '10px', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Rev: <span style={{ color: '#2E7D32', fontWeight: 700 }}>+${revenue}</span></span>
                            <span>Exp: <span style={{ color: '#B71C1C', fontWeight: 700 }}>-${expenses}</span></span>
                          </div>
                          <div style={{ fontSize: '10px', marginTop: '2px', fontWeight: 900, color: profit >= 0 ? '#1B5E20' : '#B71C1C', textAlign: 'right' }}>
                            Est. Profit: {profit >= 0 ? '+' : ''}${profit}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {btn.id === 'players' && state.players.map(p => (
                    <div key={p.id} style={{ padding: '6px', borderRadius: '6px', background: p.id === currentPlayer.id ? '#E8EAF6' : '#F5F8FA', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800 }}><span>{p.name} {p.isAI ? '(AI)' : ''}</span><span>${p.cash}</span></div>
                    </div>
                  ))}
                  {btn.id === 'stock' && airlineList.map(a => (
                    <div key={a.id} style={{ marginBottom: '8px', padding: '4px', borderBottom: '1px solid #E2E8F0' }}>
                       <div style={{ fontWeight: 800, fontSize: '11px', color: a.color }}>{a.name}</div>
                       {state.players.map(p => {
                         const count = p.holdings[a.id] || 0;
                         if (count === 0) return null;
                         return <div key={p.id} style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}><span>{p.name}</span><span>{count} sh</span></div>;
                       })}
                    </div>
                  ))}
                  {btn.id === 'log' && state.gameLog.map((log, i) => <div key={i} style={{ fontSize: '9px', color: '#37474F', padding: '2px 0', borderBottom: '0.5px solid #F0F0F0', fontFamily: 'monospace' }}>{log}</div>)}
                </CollapsibleSection>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* BOTTOM CENTER - Action Bar */}
      <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'rgba(255,255,255,0.95)', border: '0.5px solid #B0BEC5', borderRadius: '16px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: '400px' }}>
        <div style={{ fontSize: '10px', color: '#546E7A', fontWeight: 700, letterSpacing: '1px', whiteSpace: 'nowrap' }}>
          {currentPlayer.isAI ? "AI THINKING..." : state.currentPhase === 'EVENT_CARD' ? "RANDOMIZING MACRO ECONOMY" : state.currentPhase.replace('_', ' ')}
        </div>
        <div style={{ width: '1px', height: '24px', background: '#E0E0E0' }} />
        {currentPlayer.isAI ? <div style={{ fontSize: '12px', fontStyle: 'italic' }}>Optimizing strategy...</div> : (
          <>
            {state.currentPhase === 'STOCK_MARKET' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select value={selectedAirlineId} onChange={e => setSelectedAirlineId(e.target.value)} style={{ border: '0.5px solid #B0BEC5', borderRadius: '8px', padding: '6px', fontSize: '12px' }}>
                  {airlineList.map(a => <option key={a.id} value={a.id}>{a.name} (${a.stockPrice})</option>)}
                </select>
                {state.airlines[selectedAirlineId]?.stockPrice === 0 ? (
                   <button onClick={() => dispatch({ type: 'FOUND_AIRLINE', payload: { airlineId: selectedAirlineId, playerId: currentPlayer.id } })} style={{ background: '#1B5E20', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>FOUND Charter ($10)</button>
                ) : (
                  <>
                    <button onClick={handleBuy} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>BUY 1</button>
                    <button onClick={handleSell} style={{ background: '#B71C1C', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>SELL 1</button>
                  </>
                )}
                <button onClick={() => dispatch({ type: 'PASS_TURN', payload: { playerId: currentPlayer.id } })} style={{ background: '#ECEFF1', color: '#37474F', border: '0.5px solid #B0BEC5', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>PASS →</button>
              </div>
            )}
            {state.currentPhase === 'PLAN_ROUTES' && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {activeCEOAirline ? (
                  <>
                    <div style={{ background: activeCEOAirline.color, color: 'white', padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>{activeCEOAirline.name}</div>
                    <select value={targetAirlineId} onChange={e => setTargetAirlineId(e.target.value)} style={{ border: '0.5px solid #B0BEC5', borderRadius: '8px', padding: '6px', fontSize: '11px' }}>
                      <option value="">Select target for M&A</option>
                      {airlineList.filter(a => a.id !== activeCEOAirline.id && !a.isBankrupt).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={handleMA} disabled={!targetAirlineId} style={{ background: '#B71C1C', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 12px', fontSize: '11px', fontWeight: 900, cursor: 'pointer', opacity: targetAirlineId ? 1 : 0.5 }}>DECLARE M&A</button>
                    <button onClick={() => dispatch({ type: 'PASS_TURN', payload: { playerId: currentPlayer.id } })} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>DONE →</button>
                  </>
                ) : <button onClick={() => dispatch({ type: 'PASS_TURN', payload: { playerId: currentPlayer.id } })} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>SKIP</button>}
              </div>
            )}
            {state.currentPhase === 'DIVIDENDS' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                 {activeCEOAirline ? (
                   <>
                    <label style={{ fontSize: '11px' }}>Declare per sh:</label>
                    <input type="number" min="0" value={divAmount} onChange={e => setDivAmount(parseInt(e.target.value))} style={{ width: '50px', border: '0.5px solid #B0BEC5', borderRadius: '8px', padding: '6px', textAlign: 'center' }} />
                    <button onClick={() => dispatch({ type: 'DECLARE_DIVIDEND', payload: { airlineId: activeCEOAirline.id, perShareAmount: divAmount } })} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>DECLARE</button>
                   </>
                 ) : null}
                 <button onClick={() => dispatch({ type: 'PASS_TURN', payload: { playerId: currentPlayer.id } })} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>CONTINUE</button>
              </div>
            )}
            {!['STOCK_MARKET', 'PLAN_ROUTES', 'DIVIDENDS'].includes(state.currentPhase) && <button onClick={() => dispatch({ type: 'ADVANCE_PHASE' })} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 32px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>CONTINUE</button>}
          </>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: '12px', right: '64px', zIndex: 100 }}>
        {activePanel !== 'legend' ? (
          <div onClick={() => togglePanel('legend')} style={{ background: 'rgba(255,255,255,0.88)', border: '0.5px solid #B0BEC5', borderRadius: '10px', padding: '4px 10px', fontSize: '10px', color: '#546E7A', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>LEGEND ▲</div>
        ) : (
          <div onClick={() => togglePanel('legend')} style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #B0BEC5', borderRadius: '10px', padding: '12px 16px', fontSize: '10px', color: '#37474F', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '220px' }}>
            <div style={{ fontWeight: 900, marginBottom: '8px', borderBottom: '1px solid #CFD8DC', paddingBottom: '4px', fontSize: '11px' }}>MAP LEGEND</div>
            <div style={{ marginBottom: '4px' }}>— dashed — "Available slot"</div>
            <div style={{ marginBottom: '4px' }}>── solid — "Claimed route"</div>
            <div style={{ marginBottom: '4px' }}>⊙ ring — "Hub city"</div>
            <div style={{ marginBottom: '4px' }}>● large — "Mega-Hub"</div>
            <div style={{ marginBottom: '8px' }}>· small — "Regional"</div>

            <div style={{ fontWeight: 900, marginBottom: '8px', borderBottom: '1px solid #CFD8DC', paddingBottom: '4px', fontSize: '11px', marginTop: '12px' }}>RULEBOOK REFERENCE</div>
            <div style={{ marginBottom: '4px', fontWeight: 700, color: '#2E7D32' }}>REVENUE Formula:</div>
            <div style={{ marginBottom: '6px', fontStyle: 'italic' }}>(From Demand + To Demand) + (Hub Bonus: +$2 per route) - (Fare War: -$2)</div>
            
            <div style={{ marginBottom: '4px', fontWeight: 700, color: '#B71C1C' }}>EXPENSES Formula:</div>
            <div style={{ marginBottom: '6px', fontStyle: 'italic' }}>(Routes x Fuel) + Hub Tax (Multiplier x Fuel)</div>
            <div style={{ marginBottom: '6px', fontSize: '9px', color: '#546E7A' }}>* Hub Multipliers: 1st=2x, 2nd=3x, 3rd+=5x</div>

            <div style={{ marginBottom: '4px', fontWeight: 700, color: '#E65100' }}>VALUATION Formula:</div>
            <div style={{ fontStyle: 'italic' }}>Stock Price = Total Revenue / 2</div>
            <div style={{ fontSize: '9px', color: '#546E7A', marginTop: '2px' }}>* Minimum Price: $1 | Rounded Down</div>
          </div>
        )}
      </div>

      {state.currentEvent && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '24px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📰</div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1A237E', marginBottom: '8px' }}>{state.currentEvent.title}</h2>
            <p style={{ fontSize: '14px', color: '#546E7A', marginBottom: '24px', lineHeight: '1.6' }}>{state.currentEvent.description}</p>
            <div style={{ background: '#F5F8FA', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, color: '#37474F', marginBottom: '32px' }}>
              {state.currentEvent.effect}
            </div>
            <button onClick={() => dispatch({ type: 'DISMISS_EVENT' })} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '12px', padding: '16px 40px', fontSize: '16px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 16px rgba(26, 35, 126, 0.2)' }}>
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
