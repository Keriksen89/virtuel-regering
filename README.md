# Virtuel Regering

> Et interaktivt demokrativærktøj for danske borgere — form dit eget politiske parti, følg Folketinget live, juster statsbudgettet og se konsekvenserne.

En åben webapp baseret på åbne data fra Finanslov 2026, Danmarks Statistik, Folkentingets ODA-API, borgerforslag.dk og DREAM-gruppens MAKRO-model. Ingen frameworks, ingen tracking, ingen reklamer.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue)](LICENSE)
[![Data: FL2026](https://img.shields.io/badge/Data-Finanslov%202026-orange)](https://fm.dk)
[![Live data: DST](https://img.shields.io/badge/Live-Danmarks%20Statistik-teal)](https://dst.dk)

---

## Funktioner

### ⭐ Mit Parti — Politisk kompas
Tag stilling til **40 politiske positioner** på tværs af 8 politikområder og se, præcis hvor dit parti placerer sig på det politiske kompas — sammenlignet med de 11 rigtige danske partier (Ø, F, Å, A, B, M, C, V, I, O, D).

- Partiets navn, farve og mærkesager er valgfrie
- Gemmes lokalt i browseren
- Kompas-visualisering med realtids-placering

### 🗳 Borgerstemmer — Live demokrati
Stem på **24 konkrete politikforslag** på tværs af 7 kategorier. Se hvad andre brugere mener i realtid.

- IP-baseret ratelimiting + localStorage forhindrer dobbeltstemmer
- Live stemmetæller og stemmefordeling

### 💰 Økonomi & Politik — MAKRO-kalibreret budgetsimulator
Justér **11 politiske parametre** (pensionsalder, topskat, selskabsskat, asyl, forsvar, CO2-afgift m.fl.) og se øjeblikkelig budgeteffekt. For hvert ændret parameter vises:

- **Statisk effekt** (1. ordensestimat)
- **⚡ MAKRO-dynamisk effekt** — selvfinansieringsgrad og adfærdsrespons kalibreret mod [DREAM MAKRO](https://github.com/DREAM-DK/MAKRO)
- **SMILE fordelingseffekt** — progressiv/regressiv/neutral badge fra DREAM's mikrosimuleringsmodel
- **Netto budgeteffekt** og holdbarhedsindikator

### 📤 Udgifter & Indtægter — Direkte budgetjustering
Justér alle budgetposter direkte med sliders. Ændringer vises øjeblikkeligt i oversigten og fremskrivningen.

### 📈 Fremskrivning — Gæld og klima
- **Statsgælds-prognose 2026–2034** på canvas med EU-60%-referencelinje og baseline-sammenligning
- **DREAM holdbarhedsindikator** (strukturelt overskud vs. demografisk pres)
- **🌱 Klimastatus** — CO2-fremgang mod 70%-målet i 2030, baseret på Klimarådets statusrapport 2024

### 🏛 Regering & koalition
- Aktuel regeringssammensætning med koalitionsbar og mandattal
- Parlamentets hemikykel (canvas) med alle 179 mandater fordelt efter parti
- Komplet ministerliste med ministerium og parti
- Koalitionsaftalen "Ansvar for Danmark" — nøglepunkter
- **Regeringsdannelses-tracker**: Realtids-status for igangværende forhandlinger om ny regering med tidslinje og forhandlende partier

### 📊 Partier side-by-side
Sammenlign alle 11 partier på 6 politikområder og se dit match med hvert parti baseret på dine svar i Mit Parti.

### 🇩🇰 Din stemme — Demokratiguide
- Forklaring af d'Hondt-metoden og det danske valgssystem
- Trin-for-trin vejledning til valget
- Kontakt til Folketing-medlemmer og høringer
- **💰 Skatteberegner**: AM-bidrag, bundskat, kommuneskat, topskat, kirkeskat og hvad dine skattekroner bruges til
- **Borgerforslag-monitor**: Live oversigt over aktive borgerforslag fra borgerforslag.dk med underskriftsframgang, dage tilbage og direkte link til at skrive under

### 🏛 Folketing — Live afstemninger & lovforslag
- De 15 seneste afstemninger i Folketingssalen (ODA-API)
- **Aktive lovforslag** i behandling med status-indikator og link til ft.dk

### 🧑‍🤝‍🧑 Demografi — Befolkningsdata
Befolkningspyramide, projektion 2026–2070, fertilitetstrendkort, regioner, beskæftigelse og fiskalt pres-analyse. Data fra DST FOLK1A og FRDK117.

### 📡 Live økonomiske nøgletal
Øverst på alle sider vises realtidsindikatorer:
- **Inflation** (DST PRIS111, farvekodet)
- **Boligprisændring** kvartal-over-kvartal (DST EJENDOM3)
- **Nationalbankens rente**
- **Lønvækst** (DST LONS20)

---

## DREAM-integration

| DREAM-model | Anvendelse |
|-------------|-----------|
| **[MAKRO](https://github.com/DREAM-DK/MAKRO)** | Selvfinansieringsgrader for alle 11 politikparametre |
| **[GREU](https://github.com/DREAM-DK/GREU)** | CO2-afgiftsprovenu eroderer ~2–3 %/år under grøn omstilling |
| **OLG** | Holdbarhedsindikator: demografisk pres 2026–2040 |
| **SMILE** | Fordelingseffekter pr. politikparameter (progressiv/regressiv) |

> Modellen er pædagogisk — DREAM's modeller bruges til kalibrering og dynamiske korrektioner, ikke som fuld CGE-simulering.

---

## Teknisk arkitektur

```
Browser (Vanilla JS)
  ↕
Node.js / Express
  ├── /api/budget          ← Finanslov 2026 budgetmodel (MAKRO+SMILE kalibreret)
  ├── /api/dst             ← DST Statistikbank proxy (FOLK1A, NKN1, AULAAR)
  ├── /api/oda             ← Folkentingets ODA-API (afstemninger, lovforslag)
  ├── /api/livedata        ← DST live: inflation, boligpriser, NBR-rente, løn
  ├── /api/borgerforslag   ← borgerforslag.dk live: aktive forslag med signaturantal
  ├── /api/demographics    ← DST demografidata (FOLK1A, FRDK117)
  ├── /api/government      ← Statisk regeringsdata + koalitionsaftale + dannelsesstatus
  └── /api/party           ← Borgerstemmer (in-memory + votes.json, IP-ratelimiting)
```

**Frontend:** Vanilla JS — ingen frameworks, ingen bundler. 12 moduler:
`state` · `api` · `render` · `chart` · `share` · `party` · `demo` · `platform` · `regering` · `partier` · `borger` · `livedata` · `app`

**Styling:** Inter variable font (Google Fonts) · Neutral teal accent (politisk farveneutral) · Light/dark mode · Responsivt

---

## API-endpoints

| Endpoint | Beskrivelse | Cache |
|----------|-------------|-------|
| `GET /api/budget/baseline` | Budgetmodel med MAKRO/SMILE-data | 10 min |
| `GET /api/dst/keyfigures` | BNP, befolkning, ledighed | 6 t |
| `GET /api/oda/recent-votes` | Seneste 20 afstemninger | 3 t |
| `GET /api/oda/active-bills` | Aktive lovforslag i behandling | 3 t |
| `GET /api/livedata/economic` | Inflation, boligpriser, NBR, løn | 6 t |
| `GET /api/livedata/climate` | CO2-status mod 2030-mål | 24 t |
| `GET /api/livedata/inequality` | Gini-koefficient, fordeling | 24 t |
| `GET /api/borgerforslag/active` | Aktive borgerforslag med signaturantal | 1 t |
| `GET /api/borgerforslag/accepted` | Forslag der nåede 50.000 underskrifter | 6 t |
| `GET /api/party/proposals` | 24 politikforslag med live stemmer | — |
| `POST /api/party/vote` | Afgiv stemme (IP-ratelimited) | — |
| `GET /api/demographics/summary` | Fuld demografirapport | — |
| `GET /api/government/data` | Regering, parlament, dannelsesstatus | — |
| `GET /api/health` | Sundhedstjek | — |

---

## Lokal udvikling

**Krav:** Node.js 18+ og npm.

```bash
git clone https://github.com/keriksen89/virtuel-regering
cd virtuel-regering
npm install
npm run dev
```

Åbn `http://localhost:3000`.

---

## Projekt-struktur

```
virtuel-regering/
├── server/
│   ├── index.js                # Express app, middleware, CSP
│   ├── data/
│   │   └── votes.json          # Persisterede borgerstemmer
│   ├── lib/
│   │   ├── cache.js            # In-memory TTL-cache
│   │   └── fetch.js            # HTTP-klient med timeout
│   └── routes/
│       ├── budget.js           # Budgetmodel (MAKRO+SMILE)
│       ├── party.js            # Borgerstemmer, IP-voting
│       ├── demographics.js     # DST befolkningsdata
│       ├── dst.js              # DST Statistikbank proxy
│       ├── oda.js              # Folketing ODA proxy
│       ├── livedata.js         # Live DST: inflation, bolig, NBR, løn, klima, ulighed
│       ├── borgerforslag.js    # borgerforslag.dk proxy
│       └── government.js      # Regeringsdata + koalition + dannelsesstatus
└── public/
    ├── index.html
    ├── css/app.css             # Inter font, neutral teal tema, light/dark
    └── js/
        ├── state.js            # Global state, helpers, manualAdj
        ├── api.js              # API-klient
        ├── render.js           # Panel-renderers (MAKRO, holdbarhed, livedata)
        ├── chart.js            # Canvas: gæld, alderspyramide, projektion, kompas
        ├── share.js            # URL state encoding/decoding
        ├── party.js            # Borgerstemmer frontend
        ├── demo.js             # Demografipanel
        ├── platform.js         # Mit Parti — politisk kompas
        ├── regering.js         # Regering & parlamentspanel
        ├── partier.js          # Parti-sammenligning og match-score
        ├── borger.js           # Demokratiguide, skatteberegner, borgerforslag
        ├── livedata.js         # VG.livedata namespace
        └── app.js              # Bootstrap, tab-navigation, event handlers
```

---

## Datakilder

| Kilde | Anvendelse |
|-------|-----------|
| [Finanslov 2026](https://fm.dk/) | Budgettal for alle udgifts- og indtægtsposter |
| [Danmarks Statistik API](https://www.dst.dk/da/Statistik/hjaelp-til-statistikbanken/api) | FOLK1A, FRDK117, PRIS111, EJENDOM3, LONS20, NKN1, AULAAR |
| [Folkentingets ODA-API](https://www.ft.dk/dokumenter/aabne_data) | Afstemninger, lovforslag, aktører |
| [borgerforslag.dk API](https://www.borgerforslag.dk) | Aktive og vedtagne borgerforslag |
| [DREAM MAKRO](https://github.com/DREAM-DK/MAKRO) | Elasticiteter og selvfinansieringsgrader |
| [DREAM GREU](https://github.com/DREAM-DK/GREU) | CO2-afgiftsdynamik |
| [Klimarådet](https://klimaraadet.dk) | CO2-statusrapport 2024 |
| [Nationalbanken](https://www.nationalbanken.dk) | Udlånsrente |

Alle offentlige data er tilgængelige under CC-BY 4.0 eller tilsvarende åbne licenser.

---

## Licens

MIT. Frit at bruge, kopiere og modificere — også kommercielt. Kildeangivelse for offentlige data kræves under deres respektive licenser.
