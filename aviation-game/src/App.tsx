import React, { useReducer, useState, useMemo } from 'react';
import MapComponent from './MapComponent';
import { initialState } from './data/initialState';
import { gameReducer } from './store/gameReducer';

const AIRLINE_CODES: Record<string, string> = {
  Continental: 'CO', Eastern: 'EA', PanAm: 'PA', TWA: 'TW', Braniff: 'BN', Northeast: 'NE'
};

const EraSelectScreen = ({ onStart }: { onStart: (era: string, names: string[]) => void }) => {
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState(3);
  const [playerNames, setPlayerNames] = useState<string[]>(['Howard Hughes', 'Juan Trippe', 'C.R. Smith', 'Player 4', 'Player 5', 'Player 6']);

  const eras = [
    { id: '1950s', name: '1950s GOLDEN AGE', icon: '✈', subtitle: 'The Dawn of Commercial Aviation', desc: 'High demand, low fuel costs. Large ghost fleets offer lucrative dividends. Expansionist and optimistic.', difficulty: 'BEGINNER', diffColor: '#2E7D32', players: '2-4 recommended' },
    { id: '1980s', name: '1980s DEREGULATION', icon: '⚡', subtitle: 'Chaos on the Tarmac', desc: 'Volatile fuel prices. Endemic fare wars. Bankruptcies are common. Only the lean survive.', difficulty: 'ADVANCED', diffColor: '#EF6C00', players: '3-5 recommended', comingSoon: true },
    { id: '2010s', name: '2010s CONSOLIDATION', icon: '🏦', subtitle: 'The Age of Mergers', desc: 'Concentrated markets, massive networks. M&A is the dominant strategy. Investors reign supreme.', difficulty: 'EXPERT', diffColor: '#C62828', players: '3-4 recommended', comingSoon: true }
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#F0F4F8', display: 'flex', justifyContent: 'center', alignItems: 'center', overflowY: 'auto', padding: '40px' }}>
      <div style={{ maxWidth: '900px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ color: '#1A237E', fontSize: '48px', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 8px 0' }}>[WORKING TITLE]</h1>
        <p style={{ color: '#546E7A', fontSize: '20px', fontWeight: 500, marginBottom: '48px' }}>Select Your Era</p>
        <div style={{ display: 'flex', gap: '24px', marginBottom: '48px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {eras.map(era => (
            <div key={era.id} onClick={() => !era.comingSoon && setSelectedEra(era.id)} style={{ flex: '1 1 260px', minHeight: '380px', background: selectedEra === era.id ? '#E8EAF6' : 'white', border: selectedEra === era.id ? '2px solid #1A237E' : '1px solid #E2E8F0', borderRadius: '20px', padding: '32px', cursor: era.comingSoon ? 'default' : 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: selectedEra === era.id ? '0 20px 40px rgba(26, 35, 126, 0.15)' : '0 4px 12px rgba(0,0,0,0.03)', opacity: era.comingSoon ? 0.7 : 1, transform: selectedEra === era.id ? 'translateY(-8px)' : 'none' }}>
              <div style={{ fontSize: '56px', marginBottom: '20px' }}>{era.icon}</div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#1A237E' }}>{era.name}</h3>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#546E7A', textTransform: 'uppercase' }}>{era.subtitle}</p>
              <p style={{ fontSize: '13px', color: '#37474F', lineHeight: '1.6', margin: '20px 0', textAlign: 'center' }}>{era.desc}</p>
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, color: era.diffColor, background: era.diffColor + '12', padding: '4px 12px', borderRadius: '20px' }}>{era.difficulty}</span>
                <span style={{ fontSize: '11px', color: '#78909C' }}>{era.players}</span>
              </div>
              {era.comingSoon && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)', borderRadius: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}><span style={{ background: '#263238', color: 'white', padding: '6px 16px', borderRadius: '8px', fontWeight: 900, fontSize: '12px' }}>COMING SOON</span></div>}
            </div>
          ))}
        </div>
        {selectedEra && (
          <div style={{ background: 'white', padding: '40px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', animation: 'slideUp 0.4s ease-out' }}>
            <label style={{ fontSize: '11px', fontWeight: 900, color: '#546E7A', letterSpacing: '1.5px' }}>NUMBER OF PLAYERS</label>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '16px 0 32px' }}>
              {[2, 3, 4, 5, 6].map(n => <button key={n} onClick={() => setPlayerCount(n)} style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid', borderColor: playerCount === n ? '#1A237E' : '#CFD8DC', background: playerCount === n ? '#1A237E' : 'white', color: playerCount === n ? 'white' : '#546E7A', cursor: 'pointer', fontWeight: 900 }}>{n}</button>)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginBottom: '40px' }}>
              {Array.from({ length: playerCount }).map((_, i) => <div key={i} style={{ flex: '1 1 200px' }}><label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: '#90A4AE', textAlign: 'left', marginBottom: '6px' }}>PLAYER {i+1} NAME</label><input value={playerNames[i]} onChange={(e) => { const n = [...playerNames]; n[i] = e.target.value; setPlayerNames(n); }} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #ECEFF1', fontSize: '14px', fontWeight: 600, outline: 'none' }} /></div>)}
            </div>
            <button onClick={() => onStart(selectedEra, playerNames.slice(0, playerCount))} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '12px', padding: '18px 64px', fontSize: '18px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 24px rgba(26, 35, 126, 0.3)' }}>BEGIN {selectedEra.toUpperCase()}</button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [selectedAirlineId, setSelectedAirlineId] = useState<string>('Continental');
  const [divAmount, setDivAmount] = useState<number>(1);

  const currentPlayer = state.players[state.currentPlayerIndex] || state.players[0];
  const airlineList = Object.values(state.airlines);
  const activeCEOAirline = useMemo(() => airlineList.find(a => a.ceoPlayerId === currentPlayer.id), [airlineList, currentPlayer.id]);

  const handleStartGame = (era: string, names: string[]) => {
    names.forEach((name, i) => { if (state.players[i]) state.players[i].name = name; });
    setGameStarted(true);
  };

  const handleSlotClick = (routeId: string, slot: 'primary' | 'secondary') => {
    if (state.currentPhase !== 'PLAN_ROUTES' || !activeCEOAirline) return;
    const currentOccupant = state.routeState[routeId]?.[slot];
    if (currentOccupant === activeCEOAirline.id) dispatch({ type: 'REMOVE_ROUTE', payload: { airlineId: activeCEOAirline.id, routeId, slot } });
    else if (!currentOccupant) dispatch({ type: 'PLACE_ROUTE', payload: { airlineId: activeCEOAirline.id, routeId, slot } });
    else alert("Occupied.");
  };

  const handleBuy = () => {
    const a = state.airlines[selectedAirlineId];
    if (currentPlayer.cash < a.stockPrice) { alert("No cash."); return; }
    dispatch({ type: 'BUY_STOCK', payload: { airlineId: selectedAirlineId, playerId: currentPlayer.id, shares: 1 } });
  };

  const handleSell = () => {
    if ((currentPlayer.holdings[selectedAirlineId] || 0) < 1) { alert("No shares."); return; }
    dispatch({ type: 'SELL_STOCK', payload: { airlineId: selectedAirlineId, playerId: currentPlayer.id, shares: 1 } });
  };

  const handleHub = (cityId: string) => {
    if (state.currentPhase !== 'PLAN_ROUTES' || !activeCEOAirline) return;
    if (airlineList.some(a => a.hubs.includes(cityId))) { alert("Hub exists."); return; }
    if (activeCEOAirline.treasury < 15) { alert("No funds."); return; }
    dispatch({ type: 'BUILD_HUB', payload: { airlineId: activeCEOAirline.id, cityId } });
  };

  const togglePanel = (p: string) => setActivePanel(activePanel === p ? null : p);

  if (!gameStarted) return <EraSelectScreen onStart={handleStartGame} />;

  const portfolioValue = Object.entries(currentPlayer.holdings).reduce((acc, [aid, count]) => acc + (state.airlines[aid]?.stockPrice || 0) * count, 0);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', inset: 0, overflow: 'hidden', background: '#F0F4F8', color: '#37474F', fontFamily: 'Arial, sans-serif' }}>
      
      <MapComponent 
        routeState={state.routeState} cityDemand={state.cityDemand} 
        onSlotClick={handleSlotClick} onCityClick={handleHub} 
        airlineColors={Object.fromEntries(airlineList.map(a => [a.id, a.color]))} 
        airlineHubs={Object.fromEntries(airlineList.map(a => [a.id, a.hubs]))}
        activeAirlineId={activeCEOAirline?.id || null} isPlanning={state.currentPhase === 'PLAN_ROUTES'}
      />

      {/* TOP LEFT - Portfolio */}
      <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 100, background: 'rgba(255,255,255,0.88)', border: '0.5px solid #B0BEC5', borderRadius: '10px', padding: '8px 12px', minWidth: '160px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>{currentPlayer.name}</div>
        <div style={{ fontSize: '11px' }}>Cash: <span style={{ color: '#1B5E20', fontWeight: 'bold' }}>${currentPlayer.cash}</span></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', margin: '4px 0' }}>
          {Object.entries(currentPlayer.holdings).filter(([_, c]) => c > 0).map(([aid, c]) => (
            <div key={aid} style={{ background: `${state.airlines[aid]?.color}40`, color: state.airlines[aid]?.color, borderRadius: '8px', padding: '1px 6px', fontSize: '9px', fontWeight: 'bold' }}>{AIRLINE_CODES[aid]} x{c}</div>
          ))}
        </div>
        <div style={{ fontSize: '11px' }}>Net Worth: <span style={{ color: '#1A237E', fontWeight: 'bold' }}>${currentPlayer.cash + portfolioValue}</span></div>
      </div>

      {/* TOP CENTER - Phase Bar */}
      <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'rgba(255,255,255,0.92)', border: '0.5px solid #B0BEC5', borderRadius: '20px', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ background: '#1A237E', color: 'white', borderRadius: '10px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '1px' }}>{state.currentPhase}</div>
        <div style={{ width: '1px', height: '16px', background: '#E0E0E0' }} />
        <div style={{ fontSize: '12px' }}>Round <span style={{ fontWeight: 'bold' }}>{state.round}</span></div>
        <div style={{ width: '1px', height: '16px', background: '#E0E0E0' }} />
        <div style={{ fontSize: '12px' }}>Turn: <span style={{ fontWeight: 'bold', color: '#1A237E' }}>{currentPlayer.name}</span></div>
        <div style={{ width: '1px', height: '16px', background: '#E0E0E0' }} />
        <div style={{ fontSize: '12px' }}>Fuel <span style={{ fontWeight: 'bold', color: '#E65100' }}>${state.fuelPrice}</span></div>
      </div>

      {/* RIGHT EDGE - Icon Strip */}
      <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 100 }}>
        {[
          { id: 'airlines', icon: '✈', label: airlineList.length, color: '#546E7A' },
          { id: 'players', icon: '👥', label: state.players.length, color: '#546E7A' },
          { id: 'log', icon: '📋', label: 'LOG', color: '#1B5E20' }
        ].map(btn => (
          <div key={btn.id} onClick={() => togglePanel(btn.id)} style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.92)', border: '0.5px solid #B0BEC5', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <span style={{ fontSize: '16px' }}>{btn.icon}</span>
            <span style={{ fontSize: '9px', fontWeight: 'bold', color: btn.color }}>{btn.label}</span>
            
            {activePanel === btn.id && (
              <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: '56px', top: 0, width: '220px', background: 'rgba(255,255,255,0.96)', border: '0.5px solid #B0BEC5', borderRadius: '10px', padding: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '70vh', overflowY: 'auto', cursor: 'default' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#546E7A', letterSpacing: '1.5px', marginBottom: '8px', textTransform: 'uppercase' }}>{btn.id}</div>
                {btn.id === 'airlines' && airlineList.map(a => (
                  <div key={a.id} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px', borderRadius: '6px', borderLeft: `3px solid ${a.color}`, background: '#F5F8FA' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', flex: 1 }}>{a.name}</span>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#E65100' }}>${a.stockPrice}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#546E7A', marginLeft: '12px', marginTop: '2px' }}>Rt: {a.routes.length} | Hub: {a.hubs.length} | Tr: ${a.treasury}</div>
                    {!a.ceoPlayerId ? <div style={{ fontSize: '10px', color: '#78909C', fontStyle: 'italic', marginLeft: '12px' }}>Ghost (Div: ${a.ghostDividendBase})</div> : <div style={{ fontSize: '10px', color: '#1A237E', marginLeft: '12px' }}>CEO: {state.players.find(p => p.id === a.ceoPlayerId)?.name}</div>}
                  </div>
                ))}
                {btn.id === 'players' && state.players.map(p => (
                  <div key={p.id} style={{ padding: '6px 8px', borderRadius: '6px', background: p.id === currentPlayer.id ? '#E8EAF6' : '#F5F8FA', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}><span>{p.name}</span><span style={{ color: '#1B5E20' }}>${p.cash}</span></div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1A237E', marginTop: '4px' }}>NW: ${p.cash + Object.entries(p.holdings).reduce((acc, [aid, c]) => acc + (state.airlines[aid]?.stockPrice || 0) * c, 0)}</div>
                  </div>
                ))}
                {btn.id === 'log' && state.gameLog.map((log, i) => <div key={i} style={{ fontSize: '10px', color: '#37474F', padding: '3px 0', borderBottom: '0.5px solid #F0F0F0', fontFamily: 'monospace' }}>{log}</div>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* BOTTOM CENTER - Action Bar */}
      <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'rgba(255,255,255,0.95)', border: '0.5px solid #B0BEC5', borderRadius: '16px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: '400px' }}>
        <div style={{ fontSize: '10px', color: '#546E7A', fontWeight: 700, letterSpacing: '1px', whiteSpace: 'nowrap' }}>
          {state.currentPhase === 'STOCK_MARKET' ? "BUY OR SELL (1 SHARE)" : state.currentPhase === 'PLAN_ROUTES' ? "CLAIM ROUTE SLOTS" : "ADVANCE TO NEXT PHASE"}
        </div>
        <div style={{ width: '1px', height: '24px', background: '#E0E0E0' }} />

        {state.currentPhase === 'STOCK_MARKET' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select value={selectedAirlineId} onChange={e => setSelectedAirlineId(e.target.value)} style={{ border: '0.5px solid #B0BEC5', borderRadius: '8px', padding: '6px', fontSize: '12px', minWidth: '140px' }}>
              {airlineList.map(a => <option key={a.id} value={a.id}>{a.name} (${a.stockPrice})</option>)}
            </select>
            <button onClick={handleBuy} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>BUY 1</button>
            <button onClick={handleSell} style={{ background: '#B71C1C', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>SELL 1</button>
            <button onClick={() => dispatch({ type: 'PASS_TURN', payload: { playerId: currentPlayer.id } })} style={{ background: '#ECEFF1', color: '#37474F', border: '0.5px solid #B0BEC5', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>PASS →</button>
          </div>
        )}

        {state.currentPhase === 'PLAN_ROUTES' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {activeCEOAirline ? (
              <>
                <div style={{ background: activeCEOAirline.color, color: 'white', padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>{activeCEOAirline.name}</div>
                <div style={{ fontSize: '11px' }}>Routes: <span style={{ fontWeight: 'bold' }}>{activeCEOAirline.routes.length}</span> | Cost: <span style={{ fontWeight: 'bold', color: '#E65100' }}>${activeCEOAirline.routes.length * state.fuelPrice}</span></div>
                <button onClick={() => dispatch({ type: 'ADVANCE_PHASE' })} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>DONE →</button>
              </>
            ) : <button onClick={() => dispatch({ type: 'ADVANCE_PHASE' })} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>SKIP PHASE</button>}
          </div>
        )}

        {state.currentPhase === 'DIVIDENDS' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '11px' }}>Declare:</label>
            <input type="number" min="0" value={divAmount} onChange={e => setDivAmount(parseInt(e.target.value))} style={{ width: '50px', border: '0.5px solid #B0BEC5', borderRadius: '8px', padding: '6px', textAlign: 'center' }} />
            <button onClick={() => dispatch({ type: 'DECLARE_DIVIDEND', payload: { airlineId: activeCEOAirline!.id, perShareAmount: divAmount } })} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>DECLARE</button>
            <button onClick={() => dispatch({ type: 'ADVANCE_PHASE' })} style={{ background: '#ECEFF1', color: '#37474F', border: '0.5px solid #B0BEC5', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>PASS</button>
          </div>
        )}

        {['COLLECT_REVENUE', 'PAY_EXPENSES', 'RESOLVE_BANKRUPTCY', 'EVENT_CARD'].includes(state.currentPhase) && (
          <button onClick={() => dispatch({ type: 'ADVANCE_PHASE' })} style={{ background: '#1A237E', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 32px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>CONTINUE</button>
        )}
      </div>

      {/* BOTTOM RIGHT - Legend */}
      <div style={{ position: 'absolute', bottom: '12px', right: '64px', zIndex: 100 }}>
        {activePanel !== 'legend' ? (
          <div onClick={() => togglePanel('legend')} style={{ background: 'rgba(255,255,255,0.88)', border: '0.5px solid #B0BEC5', borderRadius: '10px', padding: '4px 12px', fontSize: '10px', color: '#546E7A', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>LEGEND ▲</div>
        ) : (
          <div onClick={() => togglePanel('legend')} style={{ background: 'rgba(255,255,255,0.92)', border: '0.5px solid #B0BEC5', borderRadius: '10px', padding: '8px 12px', fontSize: '10px', color: '#37474F', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: '4px' }}>— dashed — "Empty slot"</div>
            <div style={{ marginBottom: '4px' }}>── solid — "Claimed route"</div>
            <div style={{ marginBottom: '4px' }}>⊙ ring — "Hub city"</div>
            <div style={{ marginBottom: '4px' }}>● large — "Mega-Hub"</div>
            <div style={{ marginBottom: '4px' }}>• med — "Focus City"</div>
            <div>· small — "Regional"</div>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
