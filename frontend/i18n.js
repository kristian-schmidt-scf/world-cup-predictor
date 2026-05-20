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
    scoreProbTitle:  'Score probabilities',
    hmViewHeatmap:   'Heatmap',
    hmViewBar:       'Bar',
    hmHomeGoals:     'Home goals',
    hmAwayGoals:     'Away goals',
    hmWin:           'Win',
    hmDraw:          'Draw',
    hmLoss:          'Loss',
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

    // Upset detector
    upsetBadge:      'UPSET',
    upsetFavored:    pct => `${pct}% favourite`,
    upsetImpact:     'Title odds shift',
    upsetMag:        pct => `Magnitude: ${pct}%`,
    upsetFeedTitle:  'Upsets of the Tournament',
    chaosScore:      'Chaos Score',
    chaosLow:        'Low chaos',
    chaosMedium:     'Moderate chaos',
    chaosHigh:       'High chaos',
    chaosChaotic:    'Total chaos',

    // History tab
    tabHistory:         'History',
    historyTitle:       'Match Archive',
    histStats:          (n, from, to, wc) => `${n.toLocaleString()} matches · ${from}–${to} · ${wc} World Cup`,
    histFilterTeamAll:  'All teams',
    histFilterOppAll:   'All opponents',
    histTournAll:       'All tournaments',
    histTournWC:        'World Cup',
    histTournQual:      'Qualifiers',
    histTournFriendly:  'Friendlies',
    histTournOther:     'Other',
    histYearFrom:       'From year',
    histYearTo:         'To year',
    histResultAll:      'All results',
    histResultW:        'Win',
    histResultD:        'Draw',
    histResultL:        'Loss',
    histApply:          'Apply',
    histReset:          'Reset',
    histExportCsv:      'Export CSV',
    histThDate:         'Date',
    histThHome:         'Home',
    histThScore:        'Score',
    histThAway:         'Away',
    histThTournament:   'Tournament',
    histNoResults:      'No matches found for these filters.',
    histPage:           (p, n) => `Page ${p} of ${n}`,
    histBadgeWC:        'WC',
    histBadgeQual:      'QUAL',
    histBadgeFriendly:  'FRIENDLY',
    histBadgeOther:     'OTHER',
    histGoals:          'goals',
    histPens:           winner => `pens. (${winner})`,
    histCuratedTitle:   'Greatest Matches',
    histHighScoring:    'Highest-Scoring',
    histBiggestUpsets:  'Biggest Upsets',

    // Bracket creator
    bcCreateBtn:       'Create My Bracket',
    bcEditBtn:         'Edit Bracket',
    bcStepGroups:      'Group Stage',
    bcStepR32:         'Round of 32',
    bcStepR16:         'Round of 16',
    bcStepQF:          'Quarter-finals',
    bcStepSF:          'Semi-finals',
    bcStepFinal:       'Final',
    bcGroupsTitle:     'Predict Group Standings',
    bcGroupsDesc:      'Drag or use arrows to set your predicted finish for each group.',
    bcResetModel:      'Reset to model',
    bcGroupWinner:     '1st',
    bcGroupRunnerUp:   '2nd',
    bcGroupThird:      '3rd',
    bcGroupFourth:     '4th',
    bcGenBracket:      'Generate Bracket →',
    bcRoundTitle:      round => `Pick your ${round} winners`,
    bcMatch:           n => `Match ${n}`,
    bcNextRound:       'Continue →',
    bcBackRound:       '← Back',
    bcChampionLabel:   'Your Champion',
    bcSaveBracket:     'Save Bracket to Leaderboard',
    bcBracketSaved:    'Bracket saved ✓',
    bcBracketExists:   'Your bracket',
    bcNoPicksYet:      'No picks yet — create your bracket',
    bcPicksAll:        n => `${n} of ${n} picks made`,
    bcPicksRemaining:  (done, total) => `${done} of ${total} picks made`,

    // Leaderboard tab
    tabLeaderboard:        'Leaderboard',
    lbTitle:               'Prediction Leaderboard',
    lbScoringNote:         'Scoring: correct winner +8 · finalist +4 · each semi-finalist +2',
    lbJoinTitle:           'Join the Prediction League',
    lbJoinDesc:            'Pick the tournament winner, finalist, and two semi-finalists. Score points for each correct pick after the tournament.',
    lbUsernamePlaceholder: 'Your display name…',
    lbRegister:            'Register',
    lbWelcome:             name => `Welcome, ${name}!`,
    lbWelcomeName:         name => `Signed in as ${name}`,
    lbTokenLabel:          'Your secret token — save it now, it won\'t be shown again:',
    lbTokenWarn:           'Paste this token in a new browser to restore your entry.',
    lbTokenOk:             'Got it — go to my picks',
    lbRestoreTitle:        'Restore existing entry',
    lbRestoreDesc:         'Already registered? Paste your token to restore your picks.',
    lbRestoreToken:        'Paste token…',
    lbRestore:             'Restore',
    lbRestoreFailed:       'Token not recognised',
    lbYourPicks:           'Your Picks',
    lbModelHint:           team => `Model currently favours ${team} to win`,
    lbPickWinner:          'Tournament winner',
    lbPickFinalist:        'Finalist',
    lbPickSF1:             'Semi-finalist 1',
    lbPickSF2:             'Semi-finalist 2',
    lbPickChoose:          'choose team',
    lbSavePicks:           'Save Picks',
    lbPicksSaved:          'Saved ✓',
    lbPickRequired:        'Please pick a winner first',
    lbPickNoDupes:         'Each pick must be a different team',
    lbScore:               pts => `${pts} pts`,
    lbNoUsers:             'No entries yet — be the first!',
    lbAgreesModel:         '≈ model',
    lbThUser:              'User',
    lbThWinner:            'Winner',
    lbThFinalist:          'Finalist',
    lbThSF:                'Semi-finalists',
    lbThScore:             'Score',
    lbSignOut:             'Sign out',

    // Share cards
    shareCardTitle:        'Share Predictions',
    shareFormatLandscape:  'Landscape',
    shareFormatSquare:     'Square',
    shareOnX:              'Share on X',
    shareCopyImage:        'Copy Image',
    shareDownload:         'Download PNG',
    shareNoSim:            'Run a simulation to generate a share card',

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
    scoreProbTitle:  'Ergebniswahrscheinlichkeiten',
    hmViewHeatmap:   'Heatmap',
    hmViewBar:       'Balken',
    hmHomeGoals:     'Heimtore',
    hmAwayGoals:     'Auswärtstore',
    hmWin:           'Sieg',
    hmDraw:          'Unentschieden',
    hmLoss:          'Niederlage',
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

    // Upset detector
    upsetBadge:      'ÜBERRASCHUNG',
    upsetFavored:    pct => `Favorit mit ${pct}%`,
    upsetImpact:     'Titelchancen-Änderung',
    upsetMag:        pct => `Stärke: ${pct}%`,
    upsetFeedTitle:  'Überraschungen des Turniers',
    chaosScore:      'Chaos-Wert',
    chaosLow:        'Wenig Chaos',
    chaosMedium:     'Moderates Chaos',
    chaosHigh:       'Hohes Chaos',
    chaosChaotic:    'Totales Chaos',

    // History tab
    tabHistory:         'Historie',
    historyTitle:       'Spielarchiv',
    histStats:          (n, from, to, wc) => `${n.toLocaleString()} Spiele · ${from}–${to} · ${wc} WM-Spiele`,
    histFilterTeamAll:  'Alle Teams',
    histFilterOppAll:   'Alle Gegner',
    histTournAll:       'Alle Turniere',
    histTournWC:        'Weltmeisterschaft',
    histTournQual:      'Qualifikation',
    histTournFriendly:  'Freundschaftsspiele',
    histTournOther:     'Sonstiges',
    histYearFrom:       'Ab Jahr',
    histYearTo:         'Bis Jahr',
    histResultAll:      'Alle Ergebnisse',
    histResultW:        'Sieg',
    histResultD:        'Unentschieden',
    histResultL:        'Niederlage',
    histApply:          'Anwenden',
    histReset:          'Zurücksetzen',
    histExportCsv:      'CSV exportieren',
    histThDate:         'Datum',
    histThHome:         'Heim',
    histThScore:        'Ergebnis',
    histThAway:         'Gast',
    histThTournament:   'Turnier',
    histNoResults:      'Keine Spiele für diese Filter gefunden.',
    histPage:           (p, n) => `Seite ${p} von ${n}`,
    histBadgeWC:        'WM',
    histBadgeQual:      'QUALI',
    histBadgeFriendly:  'FREUNDL.',
    histBadgeOther:     'SONSTIGES',
    histGoals:          'Tore',
    histPens:           winner => `n.E. (${winner})`,
    histCuratedTitle:   'Größte Spiele',
    histHighScoring:    'Torreichste Spiele',
    histBiggestUpsets:  'Größte Überraschungen',

    // Bracket creator
    bcCreateBtn:       'Bracket erstellen',
    bcEditBtn:         'Bracket bearbeiten',
    bcStepGroups:      'Gruppenphase',
    bcStepR32:         'Runde der 32',
    bcStepR16:         'Achtelfinale',
    bcStepQF:          'Viertelfinale',
    bcStepSF:          'Halbfinale',
    bcStepFinal:       'Finale',
    bcGroupsTitle:     'Gruppenabschluss vorhersagen',
    bcGroupsDesc:      'Reihenfolge per Pfeiltasten anpassen.',
    bcResetModel:      'Modell-Vorhersage',
    bcGroupWinner:     '1.',
    bcGroupRunnerUp:   '2.',
    bcGroupThird:      '3.',
    bcGroupFourth:     '4.',
    bcGenBracket:      'Bracket generieren →',
    bcRoundTitle:      round => `${round}-Sieger wählen`,
    bcMatch:           n => `Spiel ${n}`,
    bcNextRound:       'Weiter →',
    bcBackRound:       '← Zurück',
    bcChampionLabel:   'Dein Champion',
    bcSaveBracket:     'Bracket in Rangliste speichern',
    bcBracketSaved:    'Bracket gespeichert ✓',
    bcBracketExists:   'Dein Bracket',
    bcNoPicksYet:      'Noch keine Tipps — Bracket erstellen',
    bcPicksAll:        n => `${n} von ${n} Tipps gemacht`,
    bcPicksRemaining:  (done, total) => `${done} von ${total} Tipps gemacht`,

    // Leaderboard tab
    tabLeaderboard:        'Rangliste',
    lbTitle:               'Vorhersage-Rangliste',
    lbScoringNote:         'Punkte: richtiger Sieger +8 · Finalist +4 · je Halbfinalist +2',
    lbJoinTitle:           'An der Liga teilnehmen',
    lbJoinDesc:            'Wähle Turniersieger, Finalist und zwei Halbfinalisten. Punkte nach dem Turnier.',
    lbUsernamePlaceholder: 'Dein Anzeigename…',
    lbRegister:            'Registrieren',
    lbWelcome:             name => `Willkommen, ${name}!`,
    lbWelcomeName:         name => `Angemeldet als ${name}`,
    lbTokenLabel:          'Dein geheimer Token — jetzt speichern, er wird nicht mehr angezeigt:',
    lbTokenWarn:           'Token in neuem Browser einfügen, um Eintrag wiederherzustellen.',
    lbTokenOk:             'Verstanden — zu meinen Tipps',
    lbRestoreTitle:        'Eintrag wiederherstellen',
    lbRestoreDesc:         'Bereits registriert? Token einfügen.',
    lbRestoreToken:        'Token einfügen…',
    lbRestore:             'Wiederherstellen',
    lbRestoreFailed:       'Token nicht gefunden',
    lbYourPicks:           'Deine Tipps',
    lbModelHint:           team => `Modell favorisiert aktuell ${team}`,
    lbPickWinner:          'Turniersieger',
    lbPickFinalist:        'Finalist',
    lbPickSF1:             'Halbfinalist 1',
    lbPickSF2:             'Halbfinalist 2',
    lbPickChoose:          'Team wählen',
    lbSavePicks:           'Tipps speichern',
    lbPicksSaved:          'Gespeichert ✓',
    lbPickRequired:        'Bitte zuerst einen Sieger wählen',
    lbPickNoDupes:         'Jede Vorhersage muss ein anderes Team sein',
    lbScore:               pts => `${pts} Pkt.`,
    lbNoUsers:             'Noch keine Einträge — sei der Erste!',
    lbAgreesModel:         '≈ Modell',
    lbThUser:              'Nutzer',
    lbThWinner:            'Sieger',
    lbThFinalist:          'Finalist',
    lbThSF:                'Halbfinalisten',
    lbThScore:             'Punkte',
    lbSignOut:             'Abmelden',

    // Share cards
    shareCardTitle:        'Vorhersagen teilen',
    shareFormatLandscape:  'Querformat',
    shareFormatSquare:     'Quadrat',
    shareOnX:              'Auf X teilen',
    shareCopyImage:        'Bild kopieren',
    shareDownload:         'PNG herunterladen',
    shareNoSim:            'Simulation starten um eine Grafik zu erstellen',

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
