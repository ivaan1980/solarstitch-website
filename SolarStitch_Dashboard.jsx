import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ComposedChart } from 'recharts';

const SolarStitchDashboard = () => {
  const [viewMode, setViewMode] = useState('summer');
  const [showPPA, setShowPPA] = useState(true);
  
  // Brand Colors - Solar Stitch
  const colors = {
    primary: '#1a1a1a',      // Black
    secondary: '#666666',    // Medium gray
    light: '#999999',        // Light gray
    background: '#f8f8f8',   // Off-white
    white: '#ffffff',
    text: '#333333',
    muted: '#888888',
    border: '#e5e5e5',
    // Chart accent colors (subtle, professional)
    solar: '#1a1a1a',        // Black for solar
    load: '#666666',         // Gray for load
    savings: '#2d2d2d',      // Dark for savings
    grid: '#999999',         // Light for grid
    accent: '#444444',       // Accent
  };
  
  // System specs (60kW zero-export optimized)
  const systemSize = 60;
  const numPanels = 110;
  const panelWattage = 550;
  
  // Financial data
  const projectCost = 916407;
  const energyRate = 2.6099;
  const ppaStartRate = 1.9574;
  const ppaEscalation = 0.06;
  const gridEscalation = 0.08;
  
  const [dayType, setDayType] = useState('weekday');
  
  // Seasonal profiles
  const seasonalProfiles = {
    summer: {
      name: 'Summer (December)',
      psh: 6.5,
      baseLoadKw: 8,
      peakLoadKw: 52,
      visitorFactor: 1.4,
      openHour: 8.5,      // 08:30
      closeHour: dayType === 'saturday' ? 14 : 17,  // 14:00 Sat, 17:00 weekday
      sunriseHour: 5.5,
      sunsetHour: 19.5,
    },
    winter: {
      name: 'Winter (June)',
      psh: 3.3,
      baseLoadKw: 8,
      peakLoadKw: 48,
      visitorFactor: 1.3,
      openHour: 8.5,      // 08:30
      closeHour: dayType === 'saturday' ? 14 : 17,  // 14:00 Sat, 17:00 weekday
      sunriseHour: 7.5,
      sunsetHour: 17.5,
    }
  };
  
  // Generate hourly data
  const hourlyData = useMemo(() => {
    const profile = seasonalProfiles[viewMode];
    const data = [];
    const solarNoon = 12.5;
    const solarSpread = viewMode === 'winter' ? 3.0 : 4.0;
    
    for (let hour = 0; hour < 24; hour++) {
      let loadKw = profile.baseLoadKw;
      
      // Pre-opening ramp (hour 8 = 08:00-09:00, opens at 08:30)
      if (hour === Math.floor(profile.openHour)) {
        loadKw += (profile.peakLoadKw - profile.baseLoadKw) * 0.5; // Half hour operational
      } else if (hour > profile.openHour && hour < profile.closeHour) {
        const hourInOp = hour - profile.openHour;
        const opDuration = profile.closeHour - profile.openHour;
        let visitorCurve = hourInOp < 2 ? 0.5 + hourInOp * 0.2 :
          hourInOp < opDuration - 2 ? 0.9 + 0.1 * Math.sin((hourInOp - 2) / (opDuration - 4) * Math.PI) :
          0.7 - (hourInOp - (opDuration - 2)) * 0.15;
        loadKw += (profile.peakLoadKw - profile.baseLoadKw) * visitorCurve * profile.visitorFactor;
      } else if (hour === Math.floor(profile.closeHour)) {
        loadKw += (profile.peakLoadKw - profile.baseLoadKw) * 0.4;
      } else if (hour === Math.floor(profile.closeHour) + 1) {
        loadKw += (profile.peakLoadKw - profile.baseLoadKw) * 0.15;
      } else if (hour >= 22 || hour < 6) {
        loadKw = profile.baseLoadKw * 0.9;
      } else {
        loadKw = profile.baseLoadKw * 1.1;
      }
      
      let solarKw = 0;
      let potentialSolar = 0;
      if (hour >= profile.sunriseHour && hour <= profile.sunsetHour) {
        const hourDecimal = hour + 0.5;
        const solarFactor = Math.exp(-Math.pow(hourDecimal - solarNoon, 2) / (2 * Math.pow(solarSpread, 2)));
        potentialSolar = systemSize * 0.85 * solarFactor;
        solarKw = Math.min(potentialSolar, loadKw);
      }
      
      const curtailed = Math.max(0, potentialSolar - loadKw);
      const gridImport = Math.max(0, loadKw - solarKw);
      
      data.push({
        hour,
        time: `${hour.toString().padStart(2, '0')}:00`,
        load: Math.round(loadKw * 10) / 10,
        solar: Math.round(solarKw * 10) / 10,
        potentialSolar: Math.round(potentialSolar * 10) / 10,
        curtailed: Math.round(curtailed * 10) / 10,
        gridImport: Math.round(gridImport * 10) / 10,
      });
    }
    return data;
  }, [viewMode, dayType]);
  
  // Daily totals
  const dailyTotals = useMemo(() => {
    const totalLoad = hourlyData.reduce((sum, h) => sum + h.load, 0);
    const totalSolar = hourlyData.reduce((sum, h) => sum + h.solar, 0);
    const totalPotential = hourlyData.reduce((sum, h) => sum + h.potentialSolar, 0);
    const totalCurtailed = hourlyData.reduce((sum, h) => sum + h.curtailed, 0);
    const totalImport = hourlyData.reduce((sum, h) => sum + h.gridImport, 0);
    
    const costWithoutSolar = totalLoad * energyRate;
    const costWithSolar = totalImport * energyRate;
    const ppaCost = totalSolar * ppaStartRate;
    const savingsVsGrid = costWithoutSolar - costWithSolar;
    const savingsWithPPA = costWithoutSolar - (totalImport * energyRate + ppaCost);
    
    return {
      totalLoad: Math.round(totalLoad),
      totalSolar: Math.round(totalSolar),
      totalPotential: Math.round(totalPotential),
      totalCurtailed: Math.round(totalCurtailed),
      totalImport: Math.round(totalImport),
      selfConsumptionRate: totalPotential > 0 ? Math.round((totalSolar / totalPotential) * 100) : 0,
      solarCoverage: totalLoad > 0 ? Math.round((totalSolar / totalLoad) * 100) : 0,
      costWithoutSolar: Math.round(costWithoutSolar),
      costWithSolar: Math.round(costWithSolar),
      ppaCost: Math.round(ppaCost),
      savingsVsGrid: Math.round(savingsVsGrid),
      savingsWithPPA: Math.round(savingsWithPPA),
      peakLoad: Math.max(...hourlyData.map(h => h.load)),
      peakSolar: Math.max(...hourlyData.map(h => h.solar)),
    };
  }, [hourlyData]);
  
  // PPA projections
  const ppaYears = useMemo(() => {
    const years = [];
    let cumSavings = 0;
    for (let year = 1; year <= 20; year++) {
      const degradation = Math.pow(0.995, year - 1);
      const annualGen = 89790 * degradation * 0.92;
      const gridRate = energyRate * Math.pow(1 + gridEscalation, year - 1);
      const ppaRate = ppaStartRate * Math.pow(1 + ppaEscalation, year - 1);
      const gridCost = annualGen * gridRate;
      const ppaCost = annualGen * ppaRate;
      const savings = gridCost - ppaCost;
      cumSavings += savings;
      years.push({
        year,
        gridRate: gridRate.toFixed(2),
        ppaRate: ppaRate.toFixed(2),
        savings: Math.round(savings),
        cumSavings: Math.round(cumSavings),
      });
    }
    return years;
  }, []);
  
  const profile = seasonalProfiles[viewMode];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: colors.white, 
          border: `1px solid ${colors.border}`,
          borderRadius: '4px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: colors.primary, fontWeight: '600', marginBottom: '8px' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: colors.text, fontSize: '13px', margin: '4px 0' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: entry.color, marginRight: '8px', borderRadius: '2px' }}></span>
              {entry.name}: {entry.value} kW
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: colors.background,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header - Solar Stitch Style */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ 
              fontSize: '24px', 
              fontWeight: '300', 
              letterSpacing: '8px',
              color: colors.primary 
            }}>SOLAR</span>
            <span style={{ 
              color: colors.light, 
              margin: '0 12px',
              fontWeight: '200'
            }}>|</span>
            <span style={{ 
              fontSize: '24px', 
              fontWeight: '300', 
              letterSpacing: '8px',
              color: colors.light 
            }}>STITCH</span>
          </div>
          <h1 style={{ 
            fontSize: '14px', 
            fontWeight: '400', 
            letterSpacing: '6px',
            color: colors.secondary,
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            Observatory Science Centre
          </h1>
          <p style={{ 
            color: colors.muted, 
            fontSize: '13px',
            letterSpacing: '2px'
          }}>
            60 kWp Solar System — Zero Export Configuration
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ 
          backgroundColor: colors.white, 
          borderRadius: '8px', 
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <button
            onClick={() => setViewMode('summer')}
            style={{
              padding: '12px 32px',
              borderRadius: '4px',
              border: viewMode === 'summer' ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
              backgroundColor: viewMode === 'summer' ? colors.primary : colors.white,
              color: viewMode === 'summer' ? colors.white : colors.secondary,
              fontSize: '12px',
              fontWeight: '500',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Summer
          </button>
          <button
            onClick={() => setViewMode('winter')}
            style={{
              padding: '12px 32px',
              borderRadius: '4px',
              border: viewMode === 'winter' ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
              backgroundColor: viewMode === 'winter' ? colors.primary : colors.white,
              color: viewMode === 'winter' ? colors.white : colors.secondary,
              fontSize: '12px',
              fontWeight: '500',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Winter
          </button>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer',
            marginLeft: '24px'
          }}>
            <input
              type="checkbox"
              checked={showPPA}
              onChange={(e) => setShowPPA(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: colors.primary }}
            />
            <span style={{ color: colors.secondary, fontSize: '13px' }}>Show PPA Analysis</span>
          </label>
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            marginLeft: '24px',
            padding: '4px',
            backgroundColor: colors.background,
            borderRadius: '4px'
          }}>
            <button
              onClick={() => setDayType('weekday')}
              style={{
                padding: '8px 16px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: dayType === 'weekday' ? colors.primary : 'transparent',
                color: dayType === 'weekday' ? colors.white : colors.secondary,
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Weekday
            </button>
            <button
              onClick={() => setDayType('saturday')}
              style={{
                padding: '8px 16px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: dayType === 'saturday' ? colors.primary : 'transparent',
                color: dayType === 'saturday' ? colors.white : colors.secondary,
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Saturday
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {[
            { label: 'DAILY LOAD', value: `${dailyTotals.totalLoad} kWh`, sub: 'Total consumption' },
            { label: 'SOLAR USED', value: `${dailyTotals.totalSolar} kWh`, sub: 'Self-consumed' },
            { label: 'SELF-CONSUMPTION', value: `${dailyTotals.selfConsumptionRate}%`, sub: 'Utilization rate' },
            { label: 'SOLAR COVERAGE', value: `${dailyTotals.solarCoverage}%`, sub: 'Of total load' },
            { label: 'GRID IMPORT', value: `${dailyTotals.totalImport} kWh`, sub: 'From utility' },
            { label: 'DAILY SAVINGS', value: `R ${dailyTotals.savingsVsGrid}`, sub: 'vs. no solar' },
          ].map((item, i) => (
            <div key={i} style={{
              backgroundColor: colors.white,
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: '500',
                letterSpacing: '2px',
                color: colors.muted,
                marginBottom: '8px'
              }}>{item.label}</div>
              <div style={{ 
                fontSize: '28px', 
                fontWeight: '300',
                color: colors.primary,
                marginBottom: '4px'
              }}>{item.value}</div>
              <div style={{ 
                fontSize: '11px',
                color: colors.light
              }}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Season Info */}
        <div style={{
          backgroundColor: colors.white,
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          borderLeft: `4px solid ${colors.primary}`
        }}>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '24px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '2px', color: colors.muted, marginBottom: '4px' }}>SEASON</div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: colors.primary }}>{profile.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '2px', color: colors.muted, marginBottom: '4px' }}>PEAK SUN HOURS</div>
              <div style={{ fontSize: '24px', fontWeight: '300', color: colors.primary }}>{profile.psh}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '2px', color: colors.muted, marginBottom: '4px' }}>PEAK LOAD</div>
              <div style={{ fontSize: '24px', fontWeight: '300', color: colors.primary }}>{dailyTotals.peakLoad} kW</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '2px', color: colors.muted, marginBottom: '4px' }}>PEAK SOLAR</div>
              <div style={{ fontSize: '24px', fontWeight: '300', color: colors.primary }}>{dailyTotals.peakSolar} kW</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '2px', color: colors.muted, marginBottom: '4px' }}>OPERATING</div>
              <div style={{ fontSize: '16px', fontWeight: '400', color: colors.primary }}>
                {dayType === 'saturday' ? '08:30 – 14:00' : '08:30 – 17:00'}
              </div>
              <div style={{ fontSize: '11px', color: colors.light, marginTop: '2px' }}>
                {dayType === 'saturday' ? 'Saturday' : 'Mon – Fri'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div style={{
          backgroundColor: colors.white,
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ 
            fontSize: '11px', 
            fontWeight: '500',
            letterSpacing: '3px',
            color: colors.secondary,
            marginBottom: '24px',
            textTransform: 'uppercase'
          }}>
            Daily Load vs Solar Generation — Zero Export
          </h2>
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="time" stroke={colors.muted} tick={{ fontSize: 11 }} />
              <YAxis stroke={colors.muted} tick={{ fontSize: 11 }} label={{ value: 'kW', angle: -90, position: 'insideLeft', fill: colors.muted, fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span style={{ color: colors.secondary, fontSize: '12px' }}>{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="potentialSolar"
                name="Potential Solar"
                fill={colors.light}
                fillOpacity={0.2}
                stroke={colors.light}
                strokeWidth={1}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="load"
                name="Building Load"
                stroke={colors.secondary}
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="solar"
                name="Solar Used"
                fill={colors.primary}
                fillOpacity={0.3}
                stroke={colors.primary}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="curtailed"
                name="Curtailed"
                fill="#cc0000"
                fillOpacity={0.3}
                stroke="#cc0000"
                strokeWidth={1}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Two Column Section */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px',
          marginBottom: '24px'
        }}>
          {/* Grid Import Chart */}
          <div style={{
            backgroundColor: colors.white,
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ 
              fontSize: '11px', 
              fontWeight: '500',
              letterSpacing: '3px',
              color: colors.secondary,
              marginBottom: '24px',
              textTransform: 'uppercase'
            }}>
              Hourly Grid Import
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                <XAxis dataKey="time" stroke={colors.muted} tick={{ fontSize: 9 }} />
                <YAxis stroke={colors.muted} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="gridImport" name="Grid Import" fill={colors.secondary} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cost Comparison */}
          <div style={{
            backgroundColor: colors.white,
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ 
              fontSize: '11px', 
              fontWeight: '500',
              letterSpacing: '3px',
              color: colors.secondary,
              marginBottom: '24px',
              textTransform: 'uppercase'
            }}>
              Daily Cost Comparison
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Without Solar', value: dailyTotals.costWithoutSolar, percent: 100, color: colors.muted },
                { label: 'Cash Purchase', value: dailyTotals.costWithSolar, percent: (dailyTotals.costWithSolar / dailyTotals.costWithoutSolar) * 100, color: colors.secondary },
                { label: 'PPA Option', value: dailyTotals.costWithSolar + dailyTotals.ppaCost, percent: ((dailyTotals.costWithSolar + dailyTotals.ppaCost) / dailyTotals.costWithoutSolar) * 100, color: colors.primary },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: colors.text }}>{item.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: colors.primary }}>R {item.value}</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: colors.background, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${item.percent}%`,
                      backgroundColor: item.color,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              ))}
              <div style={{ 
                borderTop: `1px solid ${colors.border}`, 
                paddingTop: '16px',
                marginTop: '8px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '10px', letterSpacing: '1px', color: colors.muted, marginBottom: '4px' }}>CASH SAVINGS</div>
                  <div style={{ fontSize: '20px', fontWeight: '400', color: colors.primary }}>R {dailyTotals.savingsVsGrid}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', letterSpacing: '1px', color: colors.muted, marginBottom: '4px' }}>PPA SAVINGS</div>
                  <div style={{ fontSize: '20px', fontWeight: '400', color: colors.primary }}>R {dailyTotals.savingsWithPPA}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summer vs Winter Comparison */}
        <div style={{
          backgroundColor: colors.white,
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ 
            fontSize: '11px', 
            fontWeight: '500',
            letterSpacing: '3px',
            color: colors.secondary,
            marginBottom: '24px',
            textTransform: 'uppercase',
            textAlign: 'center'
          }}>
            Summer vs Winter Performance
          </h2>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '24px',
            textAlign: 'center'
          }}>
            {[
              { label: 'Peak Sun Hours', summer: '6.5', winter: '3.3' },
              { label: 'Solar Used (kWh)', summer: '~280', winter: '~160' },
              { label: 'Solar Coverage', summer: '~74%', winter: '~46%' },
              { label: 'Curtailed (kWh)', summer: '~40', winter: '~0' },
              { label: 'Daily Savings', summer: '~R730', winter: '~R420' },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ fontSize: '10px', letterSpacing: '2px', color: colors.muted, marginBottom: '12px' }}>{item.label}</div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px', fontWeight: '400', color: colors.primary }}>{item.summer}</span>
                  <span style={{ color: colors.light, fontSize: '12px' }}>vs</span>
                  <span style={{ fontSize: '18px', fontWeight: '400', color: colors.secondary }}>{item.winter}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PPA Analysis */}
        {showPPA && (
          <div style={{
            backgroundColor: colors.white,
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ 
              fontSize: '11px', 
              fontWeight: '500',
              letterSpacing: '3px',
              color: colors.secondary,
              marginBottom: '24px',
              textTransform: 'uppercase'
            }}>
              20-Year PPA vs Grid Rate Projection
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={ppaYears}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis dataKey="year" stroke={colors.muted} tick={{ fontSize: 10 }} />
                  <YAxis stroke={colors.muted} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend formatter={(value) => <span style={{ color: colors.secondary, fontSize: '11px' }}>{value}</span>} />
                  <Line type="monotone" dataKey="gridRate" name="Grid Rate (8%)" stroke={colors.muted} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ppaRate" name="PPA Rate (6%)" stroke={colors.primary} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={ppaYears}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis dataKey="year" stroke={colors.muted} tick={{ fontSize: 10 }} />
                  <YAxis stroke={colors.muted} tick={{ fontSize: 10 }} tickFormatter={(v) => `R${(v/1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(v) => `R ${v.toLocaleString()}`} />
                  <Legend formatter={(value) => <span style={{ color: colors.secondary, fontSize: '11px' }}>{value}</span>} />
                  <Area type="monotone" dataKey="cumSavings" name="Cumulative Savings" fill={colors.primary} fillOpacity={0.2} stroke={colors.primary} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: `1px solid ${colors.border}`
            }}>
              {[
                { label: 'DAY 1 PPA RATE', value: 'R 1.96/kWh', sub: '25% below grid' },
                { label: 'YEAR 10 PPA RATE', value: 'R 3.50/kWh', sub: 'vs R 5.63 grid' },
                { label: 'YEAR 20 PPA RATE', value: 'R 6.28/kWh', sub: 'vs R 12.16 grid' },
                { label: '20-YEAR SAVINGS', value: 'R 3.67M', sub: 'NPV: R 1.14M' },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', letterSpacing: '1px', color: colors.muted, marginBottom: '8px' }}>{item.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: '400', color: colors.primary }}>{item.value}</div>
                  <div style={{ fontSize: '11px', color: colors.light }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financing Options */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '24px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: colors.white,
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            borderTop: `4px solid ${colors.secondary}`
          }}>
            <h3 style={{ 
              fontSize: '11px', 
              fontWeight: '500',
              letterSpacing: '3px',
              color: colors.secondary,
              marginBottom: '20px',
              textTransform: 'uppercase'
            }}>Option A: Cash Purchase</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Total Investment', value: 'R 916,407' },
                { label: 'Year 1 Savings', value: '~R 215,000' },
                { label: 'Payback Period', value: '~4.3 years' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: colors.secondary, fontSize: '13px' }}>{item.label}</span>
                  <span style={{ color: colors.primary, fontWeight: '500', fontSize: '13px' }}>{item.value}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '12px', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: colors.text, fontWeight: '500' }}>20-Year Net Benefit</span>
                  <span style={{ color: colors.primary, fontWeight: '600', fontSize: '18px' }}>~R 8.4M</span>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{
            backgroundColor: colors.white,
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            borderTop: `4px solid ${colors.primary}`
          }}>
            <h3 style={{ 
              fontSize: '11px', 
              fontWeight: '500',
              letterSpacing: '3px',
              color: colors.secondary,
              marginBottom: '20px',
              textTransform: 'uppercase'
            }}>Option B: PPA (Zero Upfront)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Upfront Cost', value: 'R 0' },
                { label: 'Starting Rate', value: 'R 1.96/kWh (25% off)' },
                { label: 'Annual Escalation', value: '6% (vs 8% grid)' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: colors.secondary, fontSize: '13px' }}>{item.label}</span>
                  <span style={{ color: colors.primary, fontWeight: '500', fontSize: '13px' }}>{item.value}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '12px', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: colors.text, fontWeight: '500' }}>20-Year Savings</span>
                  <span style={{ color: colors.primary, fontWeight: '600', fontSize: '18px' }}>R 3.67M</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          padding: '24px 0',
          borderTop: `1px solid ${colors.border}`,
          marginTop: '24px'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '300', letterSpacing: '4px', color: colors.primary }}>SOLAR</span>
            <span style={{ color: colors.light, margin: '0 8px', fontWeight: '200' }}>|</span>
            <span style={{ fontSize: '14px', fontWeight: '300', letterSpacing: '4px', color: colors.light }}>STITCH</span>
          </div>
          <p style={{ color: colors.muted, fontSize: '11px', letterSpacing: '1px', marginBottom: '4px' }}>
            60 kWp · {numPanels} × {panelWattage}W Panels · 2 × 30kW Solis Inverters · Zero Export
          </p>
          <p style={{ color: colors.light, fontSize: '11px' }}>
            Project Reference: SS-2026-SCI-002
          </p>
        </div>
      </div>
    </div>
  );
};

export default SolarStitchDashboard;
