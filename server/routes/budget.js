import { Router } from 'express';

const router = Router();

const BUDGET_DATA = {
  version: '2.1.0',
  fiscalYear: 2026,
  gdp: 2700,
  debtStartRatio: 0.30,
  lastCalibrated: '2026-05-21',
  expense: {
    pension:    { name: "Folkepension + førtidspension",     val: 240, min: 180, max: 300, info: "Største enkeltpost. Ca. 1.1 mio modtagere. Vedtaget 70 år fra 2040.",               source: "DST OFF3 + Finanslov 2026 §17" },
    social:     { name: "Øvrige sociale ydelser",            val: 180, min: 100, max: 250, info: "Kontanthjælp, dagpenge, sygedagpenge, SU, boligsikring.",                           source: "Finanslov 2026 §15, §17, §19" },
    health:     { name: "Sundhedsvæsen",                     val: 215, min: 150, max: 300, info: "Regioner 154 mia + kommunal sundhed + medicintilskud + psykiatri.",                  source: "DST BUDR32 + Finanslov 2026 §16" },
    education:  { name: "Undervisning & forskning",          val: 210, min: 140, max: 280, info: "Folkeskole, gymnasium, videregående uddannelser, SU og universitetsforskning.",       source: "DST NYT 49687 + Finanslov 2026 §19-20" },
    elderly:    { name: "Ældrepleje (kommunal)",             val: 65,  min: 40,  max: 100, info: "Hjemmepleje, plejehjem. Stiger kraftigt med aldringen frem mod 2040.",               source: "Kommunale budgetter 2026" },
    childcare:  { name: "Dagtilbud (børn)",                  val: 55,  min: 30,  max: 80,  info: "Vuggestue, børnehave, SFO. Kommunalt drevet.",                                      source: "Kommunale budgetter 2026" },
    defense:    { name: "Forsvar",                           val: 95,  min: 30,  max: 180, info: "3,5% af BNP-mål 2030. Stiger kraftigt fra 1,36% i 2022.",                           source: "Forsvarsforlig 2024-2033 + tillægsaftale okt. 2025" },
    police:     { name: "Politi, retsvæsen & fængsler",      val: 28,  min: 15,  max: 50,  info: "Politi, anklagemyndighed, domstole, kriminalforsorg og fængsler.",                   source: "Finanslov 2026 §11-12" },
    foreign:    { name: "Udenrigs & udviklingsbistand",      val: 22,  min: 5,   max: 45,  info: "0,7% af BNI-mål (FN). Ukraine-støtte og NATO-bidrag er separate.",                  source: "Finanslov 2026 §6" },
    climate:    { name: "Klima & grøn omstilling",           val: 30,  min: 10,  max: 90,  info: "CO2-fond, energitilskud, VE-anlæg, transport-omstilling. Stiger frem mod 2030.",     source: "Finanslov 2026 §29" },
    transport:  { name: "Transport & infrastruktur",         val: 40,  min: 20,  max: 80,  info: "Veje, jernbaner, kollektiv trafik, havne og luftfart.",                              source: "Finanslov 2026 §28" },
    housing:    { name: "Boligstøtte & byudvikling",         val: 22,  min: 5,   max: 50,  info: "Boligsikring, boligydelse til pensionister, byfornyelse og almene boliger.",         source: "Finanslov 2026 §17 + §14" },
    culture:    { name: "Kultur, sport & medier",            val: 13,  min: 5,   max: 25,  info: "DR, Royal Theatre, kulturinstitutioner, idræt og biblioteker.",                      source: "Finanslov 2026 §21" },
    eu:         { name: "EU-bidrag (netto)",                 val: 18,  min: 8,   max: 30,  info: "Danmarks nettobidrag til EU. Bruttobidrag ca. 26 mia minus EU-tilbagebetalinger.",   source: "Finansministeriet EU-budget 2026" },
    it:         { name: "Digitalisering & IT-infrastruktur", val: 10,  min: 3,   max: 22,  info: "Offentlig digital infrastruktur, NemID/MitID, e-gov løsninger og cybersikkerhed.",   source: "Digitaliseringsstyrelsen 2026" },
    asylum:     { name: "Asyl & integration",                val: 4,   min: 0.5, max: 15,  info: "Asylcentre, integrationsydelse, danskuddannelse og hjemsendelse.",                   source: "Finanslov 2026 §14" },
    admin:      { name: "Offentlig administration",          val: 60,  min: 35,  max: 90,  info: "Statsforvaltning, kommunal administration og fællesoffentlig IT.",                   source: "DST OFF3 aggregat" },
    interest:   { name: "Renter på statsgælden",             val: 12,  min: 3,   max: 60,  info: "Stiger markant med højere gæld eller renteniveau. Meget rentesensitiv.",             source: "Finanslov 2026 §37" },
    other:      { name: "Andre udgifter",                    val: 45,  min: 15,  max: 90,  info: "Erhvervsstøtte, landbrugsstøtte, EU-medfinansiering m.m.",                          source: "Finanslov 2026 aggregat" }
  },
  revenue: {
    income:    { name: "Personlig indkomstskat",        val: 580, min: 380, max: 780, info: "Bund-, mellem-, top-, top-topskat + kommuneskat. Største enkeltindtægt.",     source: "DST OFF12 + Skatteministeriet" },
    am:        { name: "Arbejdsmarkedsbidrag (AM)",     val: 130, min: 80,  max: 175, info: "8% af bruttoløn. Indbetales af alle lønmodtagere.",                            source: "DST OFF12" },
    vat:       { name: "Moms",                          val: 280, min: 190, max: 370, info: "25% sats. Næststørste indtægt. Bredt grundlag, lav undvigelse.",               source: "DST OFF12" },
    corp:      { name: "Selskabsskat",                  val: 95,  min: 45,  max: 170, info: "22% sats. Volatil med konjunktur og overskudsflytning.",                       source: "DST OFF12" },
    excise:    { name: "Afgifter (energi, bil, alkohol)", val: 130, min: 75, max: 220, info: "CO2, registreringsafgift, alkohol, tobak, spil og andre punktafgifter.",       source: "DST OFF12" },
    pal:       { name: "Pensionsafkastskat (PAL)",      val: 43,  min: 0,   max: 95,  info: "15,3% af pensionsafkast. Meget volatil med markedsafkast.",                    source: "Skatteministeriet 2024-niveau" },
    property:  { name: "Ejendomsværdiskat",             val: 22,  min: 8,   max: 45,  info: "Ny boligskattereform 2024 + grundskyld. Stiger i takt med boligpriser.",       source: "Skatteministeriet" },
    green:     { name: "Grønne afgifter & CO2",         val: 45,  min: 15,  max: 120, info: "CO2-afgift, energiafgifter og emissionshandel (ETS). Vokser med grøn omstilling.", source: "Skatteministeriet + SKAT" },
    other:     { name: "Øvrige indtægter",              val: 119, min: 55,  max: 210, info: "Statens udbytter (fx Ørsted), gebyrer, bøder og EU-overførsler.",              source: "DST OFF3" }
  },
  policy: {
    retireAge:   { name: "Folkepensionsalder",        val: 67,     min: 62,    max: 72,      unit: "år",    info: "Hvert år ned koster ~14 mia. Hvert år op sparer ~14 mia. Vedtaget 70 år fra 2040.",              elasticity: -14,    target: "pension", direction: "expense",
      makro: { sfr: -0.43, note: "DREAM: +1 pensionsår → ~16.000 flere i beskæftigelse → +6 mia ekstra skat/AM-bidrag oven i pensionsbesparelsen. Nettoforbedring ≈ 20 mia pr. år.", source: "DREAM (2023), Pensionsalderanalyse; Finansministeriet" },
      smile: { type: 'regressive', note: 'SMILE: Nedslidning rammer lavere uddannede hårdest. Hvert år højere pensionsalder er sværere for faglærte og ufaglærte vs. kontorarbejdere.' } },
    topTax:      { name: "Topskattesats",             val: 7.5,    min: 0,     max: 25,      unit: "%",     info: "7,5% er FL2026-niveau. Hvert pct.point ≈ 4 mia provenu. MAKRO-kalibreret.",                       elasticity: 4,      target: "income",  direction: "revenue",
      makro: { sfr:  0.25, note: "Selvfinansieringsgrad ~25%: Ændring i topskat påvirker arbejdsudbud og løndannelse. Nettoprovenu ≈ 75% af det statiske estimat (FM's officielle estimat).", source: "Finansministeriet (2022), MAKRO-kalibrering; selvfinansieringsgrad" },
      smile: { type: 'progressive', note: 'SMILE: Top 10% betaler >95% af topskatteprovenuet. Stigning i topskat er stærkt omfordelende — minimal effekt på lavere indkomstgrupper.' } },
    vatRate:     { name: "Momssats",                  val: 25,     min: 10,    max: 30,      unit: "%",     info: "Hvert pct.point ≈ 11 mia. Meget lav adfærdseffekt — bred base, lav undvigelse.",                  elasticity: 11.2,   target: "vat",     direction: "revenue",
      makro: { sfr:  0.05, note: "Moms har bred base og lav efterspørgselselasticitet. MAKRO viser nettoprovenu ≈ 95% af statisk. Minimal adfærdseffekt i DK's åbne økonomi.", source: "DREAM/Finansministeriet: momsefterspørgselselasticitet" },
      smile: { type: 'regressive', note: 'SMILE: Lavindkomstfamilier bruger en større andel af indkomsten på forbrug end høje indkomster. Momsforhøjelse er regressiv — rammer de fattigste relativt hårdest.' } },
    corpTax:     { name: "Selskabsskattesats",        val: 22,     min: 10,    max: 35,      unit: "%",     info: "Hvert pct.point ≈ 4,3 mia. EU-minimum 15%. MAKRO: selvfinansieringsgrad ~35% pga. investering.",  elasticity: 4.3,    target: "corp",    direction: "revenue",
      makro: { sfr:  0.35, note: "Åben økonomi: Selskabsskat påvirker investeringer og international overskudsflytning. MAKRO estimerer selvfinansieringsgrad ~35% på mellemlang sigt.", source: "MAKRO-model, kapitalrespons; Finansministeriet, OECD" },
      smile: { type: 'progressive', note: 'SMILE: Aktieejerskab er koncentreret i toppen. Top 20% ejer ~85% af aktier. Selskabsskat rammer primært kapitalindkomst og er progressiv i incidensen.' } },
    asylumCap:   { name: "Antal asylansøgere/år",    val: 2500,   min: 0,     max: 15000,   unit: "pers",  info: "~1.600 kr/person/dag all-in i det første år. Langsigtet arbejdsmarkedsintegration påvirker nettotal.", elasticity: 0.0016, target: "asylum",  direction: "expense",
      makro: { sfr: -0.15, note: "Langsigtet: lavere asyltal reducerer fremtidig arbejdsstyrke og skatteindtægt. MAKRO: ~15% af kortsigtet besparelse modvirkes af lavere fremtidig skattebase.", source: "Finansministeriet (2024), Fiskal effekt af migration; MAKRO" },
      smile: { type: 'neutral', note: 'SMILE: Effekterne på indkomstfordeling er komplekse og afhænger af integration. Kortsigtet: pres på lavtlønnede jobs. Langsigtet: afhænger af uddannelses- og beskæftigelsesgrad.' } },
    publicEmp:   { name: "Offentlige ansatte",        val: 850000, min: 700000, max: 1000000, unit: "pers", info: "Hvert 10.000 færre ansatte sparer ~5 mia. MAKRO: ~90% nettorealisering efter overgangseffekter.", elasticity: 0.00055, target: "admin",  direction: "expense",
      makro: { sfr:  0.10, note: "MAKRO: ~10% af lønbesparelse modvirkes midlertidigt af dagpengeudbetalinger og lavere skatteindtægt. Absorberes typisk inden for 1-2 år pga. fleksibelt DK-arbejdsmarked.", source: "MAKRO: arbejdsmarkedsmodul, beskæftigelsesrespons" },
      smile: { type: 'regressive', note: 'SMILE: Offentlig service bruges forholdsmæssigt mere af lav- og mellemindkomst (sundhed, børnepasning, ældrepleje). Reduktion rammer disse grupper relativt mere.' } },
    devAid:      { name: "Udviklingsbistand",         val: 0.7,    min: 0,     max: 1.5,     unit: "% BNI", info: "FN-mål er 0,7%. Hver 0,1 pct.point = ~2,7 mia. Ukraine-støtte er separat.",                      elasticity: 27,     target: "foreign", direction: "expense",
      makro: null,
      smile: { type: 'neutral', note: 'Neutral for indenlandsk fordeling. Gavner globalt de fattigste lande, men ingen direkte effekt på dansk indkomstulighed.' } },
    co2Tax:      { name: "CO2-afgift (kr/ton)",       val: 750,    min: 0,     max: 2500,    unit: "kr",    info: "Hvert 100 kr/ton ≈ 0,8 mia provenu. GREU: emissionsbasen eroderer med ~2-3%/år under omstilling.",  elasticity: 0.008,  target: "excise",  direction: "revenue",
      makro: { sfr:  0.08, note: "GREU (DREAM): CO2-afgift accelererer grøn omstilling og eroderer dermed sit eget provenugrundlag ~2-3% per år hurtigere. Langsigtsprovenu er lavere end statisk.", source: "DREAM GREU: Grøn omstilling, emissionsrespons + Klimarådet" },
      smile: { type: 'regressive', note: 'SMILE: Energiudgifter udgør en større andel af lavindkomst-budgetter. CO2/energiafgifter er regressive — men kan gøres neutrale ved at tilbagebetale provenu som grøn check.' } },
    defGoal:     { name: "Forsvarsbudget (% BNP)",    val: 3.5,    min: 1,     max: 6,       unit: "% BNP", info: "NATO-mål 2%. Regeringen sigter 3,5% i 2030. Hvert 0,1 pct.point = ~2,7 mia.",                    elasticity: 27,     target: "defense", direction: "expense",
      makro: { sfr: -0.20, note: "MAKRO: Offentligt forbrug (forsvar) har positiv multiplikator (~0,6). Øget forsvar skaber aktivitet i dansk forsvarsindustri og returnerer ~20% som skatter.", source: "MAKRO: offentligt forbrugsmultiplikator; Finansministeriet" },
      smile: { type: 'neutral', note: 'Neutralt for indkomstfordeling. Forsvarsudgifter er spredt bredt. Nogen positiv effekt for lavere uddannede ansatte i forsvaret (ca. 20.000 pers).' } },
    housingSupport: { name: "Boligsikrings-niveau",  val: 100,    min: 0,     max: 200,     unit: "%",     info: "100% = nuværende niveau. 150% = 50% mere i boligsikring til lejere. Hvert 10% ≈ 2 mia.",          elasticity: 0.22,   target: "housing", direction: "expense",
      makro: { sfr:  0.05, note: "MAKRO: Transferindkomst med lille forbrugseffekt. Ca. 5% returneres via moms og skat fra boligmodtagerens øgede forbrug.", source: "MAKRO: transferindkomst, husholdningsmodul" },
      smile: { type: 'progressive', note: 'SMILE: Boligsikring er stærkt målrettet lavindkomst-lejere. Øget boligsikring reducerer Gini-koefficienten og hjælper de mest trængte husstande.' } },
    welfareLevel:{ name: "Velfærdsydelser-niveau",   val: 100,    min: 60,    max: 160,     unit: "%",     info: "100% = basisniveau. Inkl. dagpenge, kontanthjælp, sygedagpenge. Hvert pct. ≈ 1,8 mia.",           elasticity: 1.8,    target: "social",  direction: "expense",
      makro: { sfr:  0.10, note: "MAKRO: Transferindkomst har positiv forbrugseffekt. ~10% returneres som moms og indkomstskat via forbrugsmultiplikatoren.", source: "MAKRO: husholdningsmodul, forbrugsmultiplikator" },
      smile: { type: 'progressive', note: 'SMILE: Dagpenge og kontanthjælp er stærkt progressivt målrettet. Stigning i velfærdsydelser reducerer fattigdom og ulighed markant (lav Gini-effekt).' } }
  },
  scenarios: {
    "fl2026":        { title: "Finanslov 2026 (faktisk)",     desc: "Den vedtagne finanslov fra december 2025.",                                     changes: {} },
    "borgerlig":     { title: "Borgerlig reform",             desc: "Lavere skatter, slankere stat, højere forsvar.",                                changes: { topTax: 5, corpTax: 18, publicEmp: 800000, defGoal: 3.5, retireAge: 68, devAid: 0.5 } },
    "rod":           { title: "Rødt scenarie",                desc: "Højere velfærd, grøn omstilling, højere topskat.",                             changes: { topTax: 12, corpTax: 25, co2Tax: 1500, devAid: 1.0, defGoal: 2.5, welfareLevel: 120 } },
    "lib2035":       { title: "Liberal Alliance 2035",        desc: "Topskat afskaffet, stærk skattereform.",                                       changes: { topTax: 0, corpTax: 17, publicEmp: 750000, devAid: 0.4, housingSupport: 70 } },
    "kriseplan":     { title: "Kriseplan: balance straks",    desc: "Hvad skal der til for nul-underskud uden statsgæld?",                         changes: { vatRate: 22, topTax: 12, retireAge: 69, publicEmp: 800000, devAid: 0.5 } },
    "klimaradikal":  { title: "Radikal klima",                desc: "Maksimal CO2-afgift, høj grøn investering.",                                   changes: { co2Tax: 2000, topTax: 10, corpTax: 24, devAid: 1.0 } },
    "nato3pct":      { title: "NATO 3% defensiv",             desc: "Forsvar på præcis 3% af BNP — kompromis ml. sparere og NATO-pres.",           changes: { defGoal: 3.0, devAid: 0.6, publicEmp: 830000 } },
    "nordisk":       { title: "Nordisk velfærdsmodel",        desc: "Sveriges og Norges model: høj skat, høj velfærd, høj produktivitet.",          changes: { topTax: 15, corpTax: 22, welfareLevel: 130, co2Tax: 1200, defGoal: 2.5, devAid: 1.0 } }
  },
  historical: {
    years: [2022, 2023, 2024, 2025, 2026],
    gdpGrowth:    [5.8, 1.8, 2.2, 2.1, 1.9],
    deficitRatio: [-0.9, 3.3, 2.6, 1.8, 1.5],
    debtRatio:    [29.8, 29.5, 30.1, 30.0, 30.0],
    totalExpense: [1180, 1250, 1310, 1360, 1418],
    totalRevenue: [1210, 1320, 1370, 1400, 1432]
  }
};

router.get('/baseline', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=600');
  res.json(BUDGET_DATA);
});

export default router;
