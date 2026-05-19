// ── i18n ─────────────────────────────────────────────────────────────────────
// Two-language (EN/DE) string table for the WC 2026 Predictor UI.
// All dynamic strings are stored as functions receiving their interpolated args.

const STRINGS = {
  en: {
    // Tabs
    tabTeams:    'Teams',
    tabMatches:  'Matches',
    tabBracket:  'Bracket',
    tabScenario: 'Scenario',

    // Teams table headers
    thGrp:    'Grp',
    thTeam:   'Team',
    thElo:    'Elo',
    thAttack: 'Attack',
    thDefense:'Defense',
    thForm:   'Form',
    thMarket: 'Market €M',
    thWinPct: 'Win%',

    // Teams section
    allTeams:          'All 48 Teams',
    searchPlaceholder: 'Search team...',
    selectTeam:        'Select a team to see details',

    // Team detail panel
    statElo:    'Elo',
    statLast5:  'Last 5',
    statRecord: 'Record (10 games)',
    statMarket: 'Market Value',
    teamMeta:            (g, conf, rank) => `Group ${g} &middot; ${conf} &middot; FIFA #${rank}`,
    groupAttackDefense:  (g) => `Group ${g} — Attack &amp; Defense`,
    pathToFinal:         'Path to Final',
    runSimForProbs:      'Run a simulation to see probabilities',

    // Matches table (dynamically rendered)
    thDate:   'Date',
    thHome:   'Home',
    thAway:   'Away',
    thXg:     'xG',
    thWDL:    'W / D / L',
    thStatus: 'Status',
    groupMatches: (g, n) => `Group ${g} — ${n} match${n !== 1 ? 'es' : ''}`,

    // Fixture row / detail
    loading:       'Loading…',
    scoreProbTitle:'Score probabilities — top 10 most likely scorelines',
    resultLocked:  'Result locked',
    unlockBtn:     'Unlock',
    lockResult:    'Lock result',
    lockBtn:       'Lock',

    // Match detail panel
    expectedGoals: 'Expected goals',
    win:  (team) => `${team} win`,
    draw: 'Draw',

    // Head-to-Head
    headToHead:     'Head-to-Head',
    noMeetings:     'No previous meetings',
    h2hPlayedGoals: (played, gf, ga) => `${played} played · ${gf}–${ga} goals`,
    h2hStronger:    (team) => `Model rates ${team} stronger than H2H suggests`,
    h2hWeaker:      (team) => `Model rates ${team} weaker than H2H suggests`,
    h2hLastN:       (n) => `Last ${n} meeting${n !== 1 ? 's' : ''}`,
    h2hW: 'W', h2hD: 'D', h2hL: 'L',
    resultW: 'W', resultD: 'D', resultL: 'L',

    // Group standings
    gsNoSim:        'Run a simulation to see projected group standings',
    simulatedStandings: 'Simulated Standings',
    gsSimCount:     (n) => `${n.toLocaleString()} simulations`,
    thPos:     '#',
    thGsTeam:  'Team',
    thAvgPts:  'Avg Pts',
    thAvgGD:   'Avg GD',
    thP1st:    '1st',
    thP2nd:    '2nd',
    thOut:     'Out',
    thQualify: 'Qualify',
    thAvgPtsTitle:  'Average points after 3 matches',
    thAvgGDTitle:   'Average goal difference',
    thP1stTitle:    'Probability of finishing 1st',
    thP2ndTitle:    'Probability of finishing 2nd',
    thOutTitle:     'Probability of finishing 4th (eliminated)',
    thQualifyTitle: 'Probability of qualifying (1st, 2nd, or best 3rd)',

    // Bracket page
    tournamentOdds: 'Tournament Odds',
    runSim:         'Run 10,000 Simulations',
    runningSim:     'Running…',
    bracketTree:    'Tree',
    bracketTable:   'Table',
    noSimBracket:   'Run a simulation to see tournament odds',
    noSimTree:      'Run a simulation to see the visual bracket',
    bracketSimInfo: (n, ms) => `${n.toLocaleString()} simulations · ${ms}ms`,

    // Round labels (bracket SVG, team detail)
    roundR32:    'R32',
    roundR16:    'R16',
    roundQF:     'QF',
    roundSF:     'SF',
    roundFinal:  'Final',
    roundWinner: 'Winner',

    // Bracket SVG labels
    bktWinner:      'WINNER',
    bktTbd:         'TBD',
    bktTooltipTitle:(label) => `Top 5 — Reach ${label}`,

    // Champion card ranks
    ranks: ['1st', '2nd', '3rd', '4th', '5th'],

    // Scenario page
    scenarioExplorer: 'Scenario Explorer',
    scenarioHelp:     'Lock group match results to explore how outcomes shift tournament probabilities.',
    runScenario:      'Run Scenario',
    clearAll:         'Clear All',
    scenarioVsBaseline: 'Scenario vs Baseline',
    matchesLocked:    (n) => `${n} match${n !== 1 ? 'es' : ''} locked`,
    scenarioNoSim:    'Lock a match result and run the scenario.',
    scenarioNoSim2:   'Lock a match result and run the scenario to see the impact.',
    allLocked:        'All matches in this group have real results locked.',
    scenarioFailed:   (msg) => `Scenario failed: ${msg}`,
    thR16BaseScen:    'R16 base → scen',
    thFinalBaseScen:  'Final base → scen',
    thWinnerBaseScen: 'Winner base → scen',

    // Groups of Death tab
    tabGroups:        'Groups',
    groupsTitle:      'Group of Death Rankings',
    groupsMethod:     'ⓘ Methodology',
    groupsMethodTip:  'Composite score = 60% normalised average Elo strength + 40% Elo competitive balance (1 − spread/max Elo). Higher score = tougher and more evenly matched group.',
    godBadge:         'Group of Death',
    gcScore:          'Score',
    gcStrength:       'Strength',
    gcBalance:        'Balance',
    gcSpread:         (n) => `${n} spread`,
    gcAvgElo:         (n) => `avg Elo ${n}`,
    gcBreakdown:      'Breakdown',
    gcLikelyQual:     'Most likely qualifiers',
    gcUpsetRisk:      'Upset risk (top-2 seeds)',
    gcWinnerPts:      'Avg winner points',
    gc3rdChance:      '3rd-place qual chance',
    gcCloseMatches:   (n) => `${n} close match${n !== 1 ? 'es' : ''}`,
    gcNoSim:          'Run a simulation to see qualification odds',
    gcAvgMarket:      (n) => `€${n}M avg`,

    // Shareable scenario URLs
    copyLink:       'Copy Link',
    shareScenario:  'Share',
    copied:         'Copied!',
    copyFailed:     'Failed',
    shareNoLocks:   'No locks',

    // Sankey flow diagram
    sankeyTitle:      'Tournament Flow',
    sankeyToggle:     'Show Flow Diagram',
    sankeyHide:       'Hide Flow Diagram',
    sankeyCompare:    'Compare with team…',
    sankeyNoSim:      'Run a simulation first',
    sankeyStageStart: 'Start',
    sankeyStageGroup: 'Groups',
    sankeyStageR32:   'R32',
    sankeyStageR16:   'R16',
    sankeyStageQF:    'QF',
    sankeyStageSF:    'SF',
    sankeyStageFinal: 'Final',
    sankeyStageWin:   'Champion',
    sankeyClickGroup: (g) => `View Group ${g} matches`,
    sankeyClickKO:    'View bracket',
    sankeyCompareLabel: (a, b) => `${a} vs ${b}`,
    sankeyCompareNone:  '— none —',

    // Status badges
    badgeUpcoming: 'Upcoming',
    badgeLive:     'LIVE',
    badgeFTScore:  (a, b) => `FT ${a}–${b}`,
    kickoffLabel:  (dt) => `Kick-off: ${dt}`,

    // Header / status bar
    statusRunning:     'Running 10,000 simulations…',
    statusSims:        (n, ms) => `${n.toLocaleString()} sims · ${ms}ms`,
    statusUpdating:    'Updating simulation…',
    statusFailed:      'Simulation failed',
    statusUnavailable: 'Simulation unavailable',
    statusInitial:     'Running initial simulation…',

    // Load error
    serverError: (msg) => `Failed to load: ${msg}`,
    serverHint:  'Is the server running? Try: ',

    // Date locale
    dateLocale: 'en-GB',
  },

  de: {
    // Tabs
    tabTeams:    'Teams',
    tabMatches:  'Spiele',
    tabBracket:  'Bracket',
    tabScenario: 'Szenarien',

    // Teams table headers
    thGrp:    'Gr.',
    thTeam:   'Team',
    thElo:    'Elo',
    thAttack: 'Angriff',
    thDefense:'Abwehr',
    thForm:   'Form',
    thMarket: 'Marktwert €M',
    thWinPct: 'Sieg%',

    // Teams section
    allTeams:          'Alle 48 Teams',
    searchPlaceholder: 'Team suchen…',
    selectTeam:        'Team auswählen für Details',

    // Team detail panel
    statElo:    'Elo',
    statLast5:  'Letzte 5',
    statRecord: 'Bilanz (10 Spiele)',
    statMarket: 'Marktwert',
    teamMeta:           (g, conf, rank) => `Gruppe ${g} &middot; ${conf} &middot; FIFA #${rank}`,
    groupAttackDefense: (g) => `Gruppe ${g} — Angriff &amp; Abwehr`,
    pathToFinal:        'Weg ins Finale',
    runSimForProbs:     'Simulation starten um Wahrscheinlichkeiten zu sehen',

    // Matches table (dynamically rendered)
    thDate:   'Datum',
    thHome:   'Heim',
    thAway:   'Gast',
    thXg:     'xT',
    thWDL:    'S / U / N',
    thStatus: 'Status',
    groupMatches: (g, n) => `Gruppe ${g} — ${n} Spiel${n !== 1 ? 'e' : ''}`,

    // Fixture row / detail
    loading:       'Laden…',
    scoreProbTitle:'Ergebniswahrscheinlichkeiten — Top 10 wahrscheinlichste Spielstände',
    resultLocked:  'Ergebnis gespeichert',
    unlockBtn:     'Freigeben',
    lockResult:    'Ergebnis festlegen',
    lockBtn:       'Festlegen',

    // Match detail panel
    expectedGoals: 'Erwartete Tore',
    win:  (team) => `${team} Sieg`,
    draw: 'Unentschieden',

    // Head-to-Head
    headToHead:     'Direktvergleich',
    noMeetings:     'Keine bisherigen Begegnungen',
    h2hPlayedGoals: (played, gf, ga) => `${played} Spiele · ${gf}:${ga} Tore`,
    h2hStronger:    (team) => `Modell bewertet ${team} stärker als Direktvergleich nahelegt`,
    h2hWeaker:      (team) => `Modell bewertet ${team} schwächer als Direktvergleich nahelegt`,
    h2hLastN:       (n) => `Letzte ${n} Begegnung${n !== 1 ? 'en' : ''}`,
    h2hW: 'S', h2hD: 'U', h2hL: 'N',
    resultW: 'S', resultD: 'U', resultL: 'N',

    // Group standings
    gsNoSim:        'Simulation starten um projizierte Gruppenrangliste zu sehen',
    simulatedStandings: 'Simulierte Tabelle',
    gsSimCount:     (n) => `${n.toLocaleString('de-DE')} Simulationen`,
    thPos:     '#',
    thGsTeam:  'Team',
    thAvgPts:  'Ø Pkt.',
    thAvgGD:   'Ø Tordiff.',
    thP1st:    '1.',
    thP2nd:    '2.',
    thOut:     'Aus',
    thQualify: 'Weiter',
    thAvgPtsTitle:  'Durchschnittliche Punkte nach 3 Spielen',
    thAvgGDTitle:   'Durchschnittliche Tordifferenz',
    thP1stTitle:    'Wahrscheinlichkeit, Gruppensieger zu werden',
    thP2ndTitle:    'Wahrscheinlichkeit, Zweiter zu werden',
    thOutTitle:     'Wahrscheinlichkeit, Letzter zu werden (ausgeschieden)',
    thQualifyTitle: 'Wahrscheinlichkeit der Qualifikation (1., 2. oder bester Dritter)',

    // Bracket page
    tournamentOdds: 'Turnierchancen',
    runSim:         '10.000 Simulationen starten',
    runningSim:     'Läuft…',
    bracketTree:    'Baum',
    bracketTable:   'Tabelle',
    noSimBracket:   'Simulation starten um Turnierchancen zu sehen',
    noSimTree:      'Simulation starten um den Bracket zu sehen',
    bracketSimInfo: (n, ms) => `${n.toLocaleString('de-DE')} Simulationen · ${ms}ms`,

    // Round labels
    roundR32:    'R32',
    roundR16:    'R16',
    roundQF:     'VF',
    roundSF:     'HF',
    roundFinal:  'Finale',
    roundWinner: 'Sieger',

    // Bracket SVG labels
    bktWinner:       'SIEGER',
    bktTbd:          'N/A',
    bktTooltipTitle: (label) => `Top 5 — ${label} erreichen`,

    // Champion card ranks
    ranks: ['1.', '2.', '3.', '4.', '5.'],

    // Scenario page
    scenarioExplorer: 'Szenario-Rechner',
    scenarioHelp:     'Gruppenspiele festlegen und sehen, wie sich Ergebnisse auf die Turnierwahrscheinlichkeiten auswirken.',
    runScenario:      'Szenario starten',
    clearAll:         'Zurücksetzen',
    scenarioVsBaseline: 'Szenario vs. Basis',
    matchesLocked:    (n) => `${n} Spiel${n !== 1 ? 'e' : ''} festgelegt`,
    scenarioNoSim:    'Ergebnis festlegen und Szenario starten.',
    scenarioNoSim2:   'Ergebnis festlegen und Szenario starten um die Auswirkungen zu sehen.',
    allLocked:        'Alle Spiele dieser Gruppe haben gespeicherte Ergebnisse.',
    scenarioFailed:   (msg) => `Szenario fehlgeschlagen: ${msg}`,
    thR16BaseScen:    'R16 Basis → Sz.',
    thFinalBaseScen:  'Finale Basis → Sz.',
    thWinnerBaseScen: 'Sieger Basis → Sz.',

    // Groups of Death tab
    tabGroups:        'Gruppen',
    groupsTitle:      'Todesgruppen-Ranking',
    groupsMethod:     'ⓘ Methodik',
    groupsMethodTip:  'Punktzahl = 60% normalisierter Elo-Durchschnitt + 40% Elo-Ausgeglichenheit (1 − Spread/Max-Elo). Höher = stärker und ausgeglichener.',
    godBadge:         'Todesgruppe',
    gcScore:          'Wert',
    gcStrength:       'Stärke',
    gcBalance:        'Ausgegl.',
    gcSpread:         (n) => `${n} Spread`,
    gcAvgElo:         (n) => `Elo Ø ${n}`,
    gcBreakdown:      'Details',
    gcLikelyQual:     'Wahrsch. Qualifikanten',
    gcUpsetRisk:      'Überraschungsrisiko (Top-2)',
    gcWinnerPts:      'Ø Punkte Gruppensieger',
    gc3rdChance:      'Drittplatzierter: Qualichance',
    gcCloseMatches:   (n) => `${n} knappes Spiel${n !== 1 ? 'e' : ''}`,
    gcNoSim:          'Simulation starten um Qualifikationsquoten zu sehen',
    gcAvgMarket:      (n) => `€${n}M Ø`,

    // Shareable scenario URLs
    copyLink:       'Link kopieren',
    shareScenario:  'Teilen',
    copied:         'Kopiert!',
    copyFailed:     'Fehler',
    shareNoLocks:   'Keine Spiele',

    // Sankey flow diagram
    sankeyTitle:      'Turnierverlauf',
    sankeyToggle:     'Flussdiagramm anzeigen',
    sankeyHide:       'Flussdiagramm ausblenden',
    sankeyCompare:    'Vergleich mit Team…',
    sankeyNoSim:      'Erst eine Simulation starten',
    sankeyStageStart: 'Start',
    sankeyStageGroup: 'Gruppen',
    sankeyStageR32:   'R32',
    sankeyStageR16:   'R16',
    sankeyStageQF:    'VF',
    sankeyStageSF:    'HF',
    sankeyStageFinal: 'Finale',
    sankeyStageWin:   'Sieger',
    sankeyClickGroup: (g) => `Gruppe ${g} Spiele ansehen`,
    sankeyClickKO:    'Bracket ansehen',
    sankeyCompareLabel: (a, b) => `${a} vs. ${b}`,
    sankeyCompareNone:  '— keiner —',

    // Status badges
    badgeUpcoming: 'Geplant',
    badgeLive:     'LIVE',
    badgeFTScore:  (a, b) => `ET ${a}:${b}`,
    kickoffLabel:  (dt) => `Anstoß: ${dt}`,

    // Header / status bar
    statusRunning:     '10.000 Simulationen laufen…',
    statusSims:        (n, ms) => `${n.toLocaleString('de-DE')} Sim. · ${ms}ms`,
    statusUpdating:    'Simulation wird aktualisiert…',
    statusFailed:      'Simulation fehlgeschlagen',
    statusUnavailable: 'Simulation nicht verfügbar',
    statusInitial:     'Erste Simulation läuft…',

    // Load error
    serverError: (msg) => `Laden fehlgeschlagen: ${msg}`,
    serverHint:  'Läuft der Server? Versuchen Sie: ',

    // Date locale
    dateLocale: 'de-DE',
  },
};

// ── German team names ────────────────────────────────────────────────────────
// English names come from the backend; only German overrides are listed here.
const TEAM_NAMES_DE = {
  MEX: 'Mexiko',       RSA: 'Südafrika',    KOR: 'Südkorea',        CZE: 'Tschechien',
  CAN: 'Kanada',       BIH: 'Bosnien-Herzegowina', QAT: 'Katar',   SUI: 'Schweiz',
  BRA: 'Brasilien',    MAR: 'Marokko',      HAI: 'Haiti',           SCO: 'Schottland',
  USA: 'USA',          PRY: 'Paraguay',     AUS: 'Australien',      TUR: 'Türkei',
  GER: 'Deutschland',  CUW: 'Curaçao',      CIV: 'Elfenbeinküste',  ECU: 'Ecuador',
  NED: 'Niederlande',  JPN: 'Japan',        SWE: 'Schweden',        TUN: 'Tunesien',
  BEL: 'Belgien',      EGY: 'Ägypten',      IRN: 'Iran',            NZL: 'Neuseeland',
  ESP: 'Spanien',      CPV: 'Kap Verde',    KSA: 'Saudi-Arabien',   URU: 'Uruguay',
  FRA: 'Frankreich',   SEN: 'Senegal',      IRQ: 'Irak',            NOR: 'Norwegen',
  ARG: 'Argentinien',  ALG: 'Algerien',     AUT: 'Österreich',      JOR: 'Jordanien',
  POR: 'Portugal',     COD: 'DR Kongo',     UZB: 'Usbekistan',      COL: 'Kolumbien',
  ENG: 'England',      CRO: 'Kroatien',     GHA: 'Ghana',           PAN: 'Panama',
};

export function teamName(id) {
  if (_lang === 'de') return TEAM_NAMES_DE[id] ?? null;
  return null; // null → caller falls back to the backend English name
}

// ── Core API ─────────────────────────────────────────────────────────────────

let _lang = (() => {
  try { return localStorage.getItem('wc26-lang') || 'en'; } catch { return 'en'; }
})();

export const getLang = () => _lang;

export function setLang(lang) {
  _lang = lang;
  try { localStorage.setItem('wc26-lang', lang); } catch {}
}

export function t(key, ...args) {
  const val = STRINGS[_lang]?.[key] ?? STRINGS.en?.[key];
  if (val === undefined) return key;
  return typeof val === 'function' ? val(...args) : val;
}
