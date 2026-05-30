// Individual international career stats for fantasy-relevant players (price >= $7M).
// Source: curated from public career records (FBref / Wikipedia), pre-tournament snapshot.
// goalsPerMatch, assistsPerMatch, yellowsPerMatch: per appearance (not per 90)
// minsPerMatch: average minutes per international appearance → drives P_APP_60

export const PLAYER_STATS = {

  // ── SUPERSTARS ($10–$10.5M) ───────────────────────────────────────────────
  'BRA_FWD_1': { goalsPerMatch: 0.37, assistsPerMatch: 0.26, yellowsPerMatch: 0.11, minsPerMatch: 80 }, // Vinicius Jr
  'FRA_FWD_1': { goalsPerMatch: 0.65, assistsPerMatch: 0.43, yellowsPerMatch: 0.08, minsPerMatch: 84 }, // Mbappe
  'NOR_FWD_1': { goalsPerMatch: 0.76, assistsPerMatch: 0.12, yellowsPerMatch: 0.05, minsPerMatch: 81 }, // Haaland
  'ENG_FWD_1': { goalsPerMatch: 0.74, assistsPerMatch: 0.21, yellowsPerMatch: 0.06, minsPerMatch: 85 }, // Kane
  'ESP_MID_1': { goalsPerMatch: 0.26, assistsPerMatch: 0.48, yellowsPerMatch: 0.05, minsPerMatch: 81 }, // Lamine Yamal
  'FRA_MID_1': { goalsPerMatch: 0.25, assistsPerMatch: 0.40, yellowsPerMatch: 0.10, minsPerMatch: 73 }, // Dembele
  'ARG_FWD_1': { goalsPerMatch: 0.58, assistsPerMatch: 0.29, yellowsPerMatch: 0.13, minsPerMatch: 74 }, // Messi
  'POR_FWD_1': { goalsPerMatch: 0.63, assistsPerMatch: 0.21, yellowsPerMatch: 0.08, minsPerMatch: 77 }, // Ronaldo

  // ── ELITE ($9–$9.5M) ─────────────────────────────────────────────────────
  'KOR_FWD_1': { goalsPerMatch: 0.30, assistsPerMatch: 0.18, yellowsPerMatch: 0.07, minsPerMatch: 82 }, // Son
  'EGY_MID_1': { goalsPerMatch: 0.60, assistsPerMatch: 0.32, yellowsPerMatch: 0.07, minsPerMatch: 83 }, // Salah
  'FRA_MID_2': { goalsPerMatch: 0.33, assistsPerMatch: 0.40, yellowsPerMatch: 0.06, minsPerMatch: 73 }, // Olise
  'ENG_MID_1': { goalsPerMatch: 0.28, assistsPerMatch: 0.38, yellowsPerMatch: 0.06, minsPerMatch: 83 }, // Saka

  // ── PREMIUM ($8–$8.5M) ────────────────────────────────────────────────────
  'FRA_FWD_2': { goalsPerMatch: 0.33, assistsPerMatch: 0.25, yellowsPerMatch: 0.10, minsPerMatch: 79 }, // Griezmann
  'ARG_FWD_2': { goalsPerMatch: 0.43, assistsPerMatch: 0.26, yellowsPerMatch: 0.07, minsPerMatch: 79 }, // J. Alvarez
  'ARG_FWD_3': { goalsPerMatch: 0.44, assistsPerMatch: 0.21, yellowsPerMatch: 0.09, minsPerMatch: 78 }, // Lautaro
  'POR_MID_1': { goalsPerMatch: 0.29, assistsPerMatch: 0.33, yellowsPerMatch: 0.12, minsPerMatch: 85 }, // Bruno Fernandes
  'ENG_MID_4': { goalsPerMatch: 0.21, assistsPerMatch: 0.24, yellowsPerMatch: 0.06, minsPerMatch: 78 }, // Foden
  'ENG_MID_2': { goalsPerMatch: 0.42, assistsPerMatch: 0.16, yellowsPerMatch: 0.08, minsPerMatch: 84 }, // Bellingham
  'BRA_MID_1': { goalsPerMatch: 0.38, assistsPerMatch: 0.29, yellowsPerMatch: 0.08, minsPerMatch: 80 }, // Raphinha
  'ESP_MID_2': { goalsPerMatch: 0.16, assistsPerMatch: 0.30, yellowsPerMatch: 0.09, minsPerMatch: 81 }, // Pedri
  'ESP_FWD_1': { goalsPerMatch: 0.27, assistsPerMatch: 0.22, yellowsPerMatch: 0.06, minsPerMatch: 70 }, // Oyarzabal
  'COL_MID_1': { goalsPerMatch: 0.21, assistsPerMatch: 0.22, yellowsPerMatch: 0.09, minsPerMatch: 81 }, // Luis Diaz
  'GER_MID_1': { goalsPerMatch: 0.22, assistsPerMatch: 0.29, yellowsPerMatch: 0.07, minsPerMatch: 80 }, // Musiala
  'SWE_FWD_2': { goalsPerMatch: 0.35, assistsPerMatch: 0.09, yellowsPerMatch: 0.09, minsPerMatch: 79 }, // Isak
  'BEL_FWD_1': { goalsPerMatch: 0.70, assistsPerMatch: 0.17, yellowsPerMatch: 0.11, minsPerMatch: 82 }, // Lukaku
  'SEN_FWD_1': { goalsPerMatch: 0.35, assistsPerMatch: 0.19, yellowsPerMatch: 0.07, minsPerMatch: 81 }, // Mane
  'ENG_MID_3': { goalsPerMatch: 0.29, assistsPerMatch: 0.36, yellowsPerMatch: 0.07, minsPerMatch: 74 }, // Eze

  // ── HIGH-VALUE ($7.5–$7.9M) ───────────────────────────────────────────────
  'GER_FWD_1': { goalsPerMatch: 0.31, assistsPerMatch: 0.17, yellowsPerMatch: 0.07, minsPerMatch: 78 }, // Havertz
  'SWE_FWD_1': { goalsPerMatch: 0.76, assistsPerMatch: 0.10, yellowsPerMatch: 0.05, minsPerMatch: 81 }, // Gyokeres
  'ESP_FWD_2': { goalsPerMatch: 0.40, assistsPerMatch: 0.18, yellowsPerMatch: 0.06, minsPerMatch: 69 }, // Ferran Torres
  'POR_MID_2': { goalsPerMatch: 0.27, assistsPerMatch: 0.23, yellowsPerMatch: 0.08, minsPerMatch: 72 }, // Leao
  'POR_MID_3': { goalsPerMatch: 0.21, assistsPerMatch: 0.25, yellowsPerMatch: 0.10, minsPerMatch: 81 }, // Bernardo Silva
  'NED_FWD_1': { goalsPerMatch: 0.40, assistsPerMatch: 0.19, yellowsPerMatch: 0.08, minsPerMatch: 79 }, // Gakpo
  'ESP_MID_3': { goalsPerMatch: 0.30, assistsPerMatch: 0.28, yellowsPerMatch: 0.08, minsPerMatch: 76 }, // Dani Olmo
  'NOR_MID_1': { goalsPerMatch: 0.27, assistsPerMatch: 0.33, yellowsPerMatch: 0.08, minsPerMatch: 83 }, // Odegaard

  // ── MID-RANGE ($7–$7.5M) ─────────────────────────────────────────────────
  'MEX_FWD_2': { goalsPerMatch: 0.46, assistsPerMatch: 0.17, yellowsPerMatch: 0.06, minsPerMatch: 76 }, // Gimenez
  'SUI_FWD_1': { goalsPerMatch: 0.31, assistsPerMatch: 0.12, yellowsPerMatch: 0.12, minsPerMatch: 77 }, // Embolo
  'BRA_MID_3': { goalsPerMatch: 0.20, assistsPerMatch: 0.27, yellowsPerMatch: 0.14, minsPerMatch: 78 }, // Paqueta
  'GER_MID_2': { goalsPerMatch: 0.33, assistsPerMatch: 0.40, yellowsPerMatch: 0.06, minsPerMatch: 80 }, // Wirtz
  'NED_MID_2': { goalsPerMatch: 0.32, assistsPerMatch: 0.36, yellowsPerMatch: 0.07, minsPerMatch: 80 }, // Xavi Simons
  'JPN_MID_1': { goalsPerMatch: 0.26, assistsPerMatch: 0.28, yellowsPerMatch: 0.07, minsPerMatch: 81 }, // Mitoma
  'SWE_MID_1': { goalsPerMatch: 0.24, assistsPerMatch: 0.22, yellowsPerMatch: 0.08, minsPerMatch: 77 }, // Kulusevski
  'BEL_MID_1': { goalsPerMatch: 0.28, assistsPerMatch: 0.44, yellowsPerMatch: 0.09, minsPerMatch: 78 }, // De Bruyne
  'BEL_MID_2': { goalsPerMatch: 0.19, assistsPerMatch: 0.28, yellowsPerMatch: 0.10, minsPerMatch: 73 }, // Doku
  'ESP_MID_4': { goalsPerMatch: 0.12, assistsPerMatch: 0.27, yellowsPerMatch: 0.14, minsPerMatch: 83 }, // Rodri
  'URU_MID_1': { goalsPerMatch: 0.19, assistsPerMatch: 0.17, yellowsPerMatch: 0.12, minsPerMatch: 83 }, // Valverde
  'URU_FWD_1': { goalsPerMatch: 0.46, assistsPerMatch: 0.19, yellowsPerMatch: 0.12, minsPerMatch: 77 }, // Darwin Nunez
  'FRA_MID_3': { goalsPerMatch: 0.30, assistsPerMatch: 0.30, yellowsPerMatch: 0.07, minsPerMatch: 66 }, // Desire Doue
  'ARG_MID_3': { goalsPerMatch: 0.16, assistsPerMatch: 0.20, yellowsPerMatch: 0.12, minsPerMatch: 79 }, // Enzo Fernandez
  'ENG_FWD_2': { goalsPerMatch: 0.28, assistsPerMatch: 0.17, yellowsPerMatch: 0.07, minsPerMatch: 69 }, // Rashford
  'GER_MID_3': { goalsPerMatch: 0.25, assistsPerMatch: 0.34, yellowsPerMatch: 0.07, minsPerMatch: 75 }, // Leroy Sane
  'BRA_FWD_2': { goalsPerMatch: 0.20, assistsPerMatch: 0.25, yellowsPerMatch: 0.10, minsPerMatch: 73 }, // Matheus Cunha
  'TUR_MID_1': { goalsPerMatch: 0.31, assistsPerMatch: 0.27, yellowsPerMatch: 0.14, minsPerMatch: 83 }, // Calhanoglu
  'MEX_FWD_1': { goalsPerMatch: 0.32, assistsPerMatch: 0.09, yellowsPerMatch: 0.08, minsPerMatch: 79 }, // Jimenez
  'CAN_FWD_1': { goalsPerMatch: 0.44, assistsPerMatch: 0.19, yellowsPerMatch: 0.07, minsPerMatch: 82 }, // Jonathan David
  'MAR_FWD_1': { goalsPerMatch: 0.38, assistsPerMatch: 0.10, yellowsPerMatch: 0.10, minsPerMatch: 78 }, // En-Nesyri
  'USA_MID_1': { goalsPerMatch: 0.42, assistsPerMatch: 0.30, yellowsPerMatch: 0.08, minsPerMatch: 83 }, // Pulisic
  'TUR_MID_2': { goalsPerMatch: 0.28, assistsPerMatch: 0.32, yellowsPerMatch: 0.07, minsPerMatch: 77 }, // Kenan Yildiz
  'TUR_MID_3': { goalsPerMatch: 0.30, assistsPerMatch: 0.35, yellowsPerMatch: 0.06, minsPerMatch: 75 }, // Arda Guler
  'ECU_MID_1': { goalsPerMatch: 0.08, assistsPerMatch: 0.10, yellowsPerMatch: 0.16, minsPerMatch: 83 }, // Caicedo
  'NED_MID_3': { goalsPerMatch: 0.11, assistsPerMatch: 0.26, yellowsPerMatch: 0.09, minsPerMatch: 80 }, // Frenkie de Jong
  'NED_MID_4': { goalsPerMatch: 0.26, assistsPerMatch: 0.26, yellowsPerMatch: 0.10, minsPerMatch: 80 }, // Koopmeiners
  'BEL_FWD_2': { goalsPerMatch: 0.28, assistsPerMatch: 0.16, yellowsPerMatch: 0.08, minsPerMatch: 78 }, // Openda
  'EGY_MID_2': { goalsPerMatch: 0.46, assistsPerMatch: 0.26, yellowsPerMatch: 0.08, minsPerMatch: 79 }, // Marmoush
  'ESP_FWD_3': { goalsPerMatch: 0.40, assistsPerMatch: 0.20, yellowsPerMatch: 0.09, minsPerMatch: 77 }, // Morata
  'FRA_FWD_3': { goalsPerMatch: 0.33, assistsPerMatch: 0.25, yellowsPerMatch: 0.08, minsPerMatch: 64 }, // Kolo Muani
  'POR_FWD_2': { goalsPerMatch: 0.44, assistsPerMatch: 0.20, yellowsPerMatch: 0.06, minsPerMatch: 73 }, // Goncalo Ramos
  'ENG_MID_5': { goalsPerMatch: 0.08, assistsPerMatch: 0.12, yellowsPerMatch: 0.12, minsPerMatch: 85 }, // Declan Rice
  'ENG_FWD_3': { goalsPerMatch: 0.50, assistsPerMatch: 0.27, yellowsPerMatch: 0.06, minsPerMatch: 73 }, // Ollie Watkins
};

export const getPlayerStats = id => PLAYER_STATS[id] ?? null;
