import { Router } from 'express';

const router = Router();

const BUDGET_DATA = {
  version: '2.0.0',
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
    retireAge:   { name: "Folkepensionsalder",        val: 67,     min: 62,    max: 72,      unit: "år",    info: "Hvert år ned koster ~14 mia. Hvert år op sparer ~14 mia. Vedtaget 70 år fra 2040.",              elasticity: 14,     target: "pension", direction: "expense" },
    topTax:      { name: "Topskattesats",             val: 7.5,    min: 0,     max: 25,      unit: "%",     info: "7,5% er FL2026-niveau. Hvert pct.point ≈ 4 mia provenu.",                                        elasticity: 4,      target: "income",  direction: "revenue" },
    vatRate:     { name: "Momssats",                  val: 25,     min: 10,    max: 30,      unit: "%",     info: "Hvert pct.point ≈ 11 mia. Lavere moms = lavere priser, lavere provenu.",                         elasticity: 11.2,   target: "vat",     direction: "revenue" },
    corpTax:     { name: "Selskabsskattesats",        val: 22,     min: 10,    max: 35,      unit: "%",     info: "Hvert pct.point ≈ 4,3 mia. EU-minimum 15%. Risiko for kapitaludflytning over 25%.",              elasticity: 4.3,    target: "corp",    direction: "revenue" },
    asylumCap:   { name: "Antal asylansøgere/år",    val: 2500,   min: 0,     max: 15000,   unit: "pers",  info: "~1.600 kr/person/dag all-in i det første år. Tal er omstridt: lavere vs. højere estimater.",       elasticity: 0.0016, target: "asylum",  direction: "expense" },
    publicEmp:   { name: "Offentlige ansatte",        val: 850000, min: 700000, max: 1000000, unit: "pers", info: "Hvert 10.000 færre ansatte sparer ~5 mia på løn og pension. Påvirker serviceniveau.",              elasticity: 0.0005, target: "admin",   direction: "expense" },
    devAid:      { name: "Udviklingsbistand",         val: 0.7,    min: 0,     max: 1.5,     unit: "% BNI", info: "FN-mål er 0,7%. Hver 0,1 pct.point = ~2,7 mia. Ukraine-støtte er separat.",                      elasticity: 27,     target: "foreign", direction: "expense" },
    co2Tax:      { name: "CO2-afgift (kr/ton)",       val: 750,    min: 0,     max: 2500,    unit: "kr",    info: "Hvert 100 kr/ton ≈ 0,8 mia provenu (faldende basis pga. omstilling). Vedtaget 2025.",            elasticity: 0.008,  target: "excise",  direction: "revenue" },
    defGoal:     { name: "Forsvarsbudget (% BNP)",    val: 3.5,    min: 1,     max: 6,       unit: "% BNP", info: "NATO-mål 2%. Regeringen sigter 3,5% i 2030. Hver 0,1 pct.point = ~2,7 mia.",                     elasticity: 27,     target: "defense", direction: "expense" },
    housingSupport: { name: "Boligsikrings-niveau",  val: 100,    min: 0,     max: 200,     unit: "%",     info: "100% = nuværende niveau. 150% = 50% mere i boligsikring til lejere. Hvert 10% ≈ 2 mia.",          elasticity: 0.22,   target: "housing", direction: "expense" },
    welfareLevel:{ name: "Velfærdsydelser-niveau",   val: 100,    min: 60,    max: 160,     unit: "%",     info: "100% = basisniveau. Inkl. dagpenge, kontanthjælp, sygedagpenge. Hvert pct. ≈ 1,8 mia.",           elasticity: 1.8,    target: "social",  direction: "expense" }
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
