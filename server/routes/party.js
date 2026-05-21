import { Router } from 'express';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const VOTES_FILE = join(DATA_DIR, 'votes.json');

const PROPOSALS = [
  // --- SKAT ---
  {
    id: 'top-tax-abolish',
    category: 'Skat',
    title: 'Afskaff topskatte',
    description: 'Topskatten rammer indkomster over ca. 620.000 kr/år. Afskaffelse giver ca. 10 mia i skattelettelse til højindkomster, men øger ulighed.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: -10, description: '-10 mia i provenu' }
  },
  {
    id: 'vat-raise',
    category: 'Skat',
    title: 'Hæv momsen til 27%',
    description: 'Hvert pct.point moms giver ca. 11 mia kr ekstra. To pct.point giver 22 mia men rammer bredt — også lavindkomster.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 22, description: '+22 mia i provenu' }
  },
  {
    id: 'corp-tax-raise',
    category: 'Skat',
    title: 'Hæv selskabsskatten til 25%',
    description: 'Danmark har 22% — EU-gennemsnit er 21%. En hævning til 25% giver ca. 13 mia ekstra, men kan presse udenlandske investeringer væk.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 13, description: '+13 mia i provenu' }
  },
  {
    id: 'wealth-tax',
    category: 'Skat',
    title: 'Indfør formueskat på 1%',
    description: '1% årlig skat på formuer over 10 mio kr. Ca. 10.000 danskere har formue over 10 mio. Anslået provenu: 8–12 mia kr/år.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 10, description: '+10 mia estimeret provenu' }
  },
  {
    id: 'income-tax-cut',
    category: 'Skat',
    title: 'Sænk bundskatte med 3%',
    description: 'Sænker skatten for alle med indkomst. Koster ca. 25 mia i provenu men øger købekraft og arbejdsudbud. Finansministeriets selvfinansieringsgrad: 15-25%.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: -25, description: '-25 mia i provenu' }
  },

  // --- VELFÆRD ---
  {
    id: 'pension-age-70',
    category: 'Velfærd',
    title: 'Hæv folkepensionsalderen til 70 år',
    description: 'Allerede vedtaget for dem født efter 1967. Fremrykning til alle spare ca. 42 mia på pension og folkepension, men kræver hårdt arbejde til høj alder.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: -42, description: '-42 mia i pensionsudgifter' }
  },
  {
    id: 'dagpenge-3yr',
    category: 'Velfærd',
    title: 'Udvid dagpengeret til 3 år',
    description: 'Nu er max 2 år. Tre år giver bedre tryghed ved ledighed, men koster ca. 5–8 mia og kan reducere jobsøgningsincentiver.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 7, description: '+7 mia i dagpengeudgifter' }
  },
  {
    id: 'free-dental',
    category: 'Velfærd',
    title: 'Gratis tandpleje til alle',
    description: 'I dag er tandpleje privat (med delvis tilskud). Fuld offentlig tandpleje koster ca. 10–15 mia men sikrer lighed og forebygger følgesygdomme.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 12, description: '+12 mia i sundhedsudgifter' }
  },
  {
    id: '4day-week',
    category: 'Velfærd',
    title: '32-timers arbejdsuge i offentlig sektor',
    description: 'Reducerer den ugentlige arbejdstid fra 37 til 32 timer uden lønnedgang. Kræver ansættelse af ca. 13% flere offentlige ansatte — ca. 25 mia ekstra.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 25, description: '+25 mia i lønudgifter' }
  },
  {
    id: 'childcare-free',
    category: 'Velfærd',
    title: 'Gratis dagtilbud til alle børn',
    description: 'Forældre betaler i dag op til 25% af daginstitutionsudgifterne. Fuld gratis daginstitution koster ca. 12 mia men frigiver købekraft og øger ligestilling.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 12, description: '+12 mia i dagtilbudsudgifter' }
  },

  // --- KLIMA ---
  {
    id: 'co2-tax-1500',
    category: 'Klima',
    title: 'Hæv CO2-afgiften til 1.500 kr/ton',
    description: 'Nu 750 kr/ton. Fordobling til 1.500 giver ~6 mia ekstra provenu og rykker markant på adfærd og erhvervets omstilling. Vedtaget af klimaeksperter.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 6, description: '+6 mia i CO2-provenu' }
  },
  {
    id: 'petrol-ban-2030',
    category: 'Klima',
    title: 'Forbyd salg af benzin/diesel biler i 2030',
    description: 'EU forbyder det i 2035 — Danmark vil gå 5 år foran. Kræver massiv elbil-infrastruktur men reducerer CO2-udledning markant på lang sigt.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 5, description: '+5 mia i infrastrukturinvesteringer' }
  },
  {
    id: 'green-fund-double',
    category: 'Klima',
    title: 'Fordobl den grønne omstillingsfond',
    description: 'Den nuværende grønne fond er 30 mia. Fordobling til 60 mia øger subsidier til vind, brint og energirenovering. Kan tiltrække privat kapital 3:1.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 30, description: '+30 mia i klimainvesteringer' }
  },

  // --- FORSVAR ---
  {
    id: 'defense-3pct',
    category: 'Forsvar',
    title: 'Danmark skal bruge 3% af BNP på forsvar',
    description: 'Regeringen sigter på 3,5%. At sætte målet til 3% (81 mia) sparer ca. 14 mia vs. nuværende plan. NATO-aftale kræver minimum 2%.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: -14, description: '-14 mia ift. nuværende forsvarsplan' }
  },
  {
    id: 'nato-stay',
    category: 'Forsvar',
    title: 'Danmark bør forblive i NATO',
    description: 'NATO-medlemskab har garanteret dansk sikkerhed siden 1949. Udmeldelse ville kræve massivt eigendefense-opbygning — anslået 150+ mia ekstra.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 0, description: 'Ingen direkte budgeteffekt' }
  },
  {
    id: 'cyber-defense-5b',
    category: 'Forsvar',
    title: 'Øg cyberforsvaret med 5 mia/år',
    description: 'Danmark er mål for mange statslige cyberangreb. 5 mia ekstra til Center for Cybersikkerhed og militær cyber-kapabilitet er forsvarschefens anbefaling.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 5, description: '+5 mia i cyberforsvarsudgifter' }
  },

  // --- IMMIGRATION ---
  {
    id: 'asylum-cap-500',
    category: 'Immigration',
    title: 'Sæt loft over asylansøgere på 500/år',
    description: 'I 2026 er ca. 2.500 asylansøgere om året. Reduktion til 500 kræver nye EU-undtagelser og streng grænseovervågning. Sparer ca. 3 mia.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: -3, description: '-3 mia i asylomkostninger' }
  },
  {
    id: 'integration-double',
    category: 'Immigration',
    title: 'Fordobl integrationsindsatsen',
    description: 'Bedre sprogundervisning, jobvejledning og mentorprogrammer. Koster 5 mia på kort sigt men kan øge beskæftigelsen og reducere sociale udgifter på lang sigt.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 5, description: '+5 mia i integrationsudgifter' }
  },
  {
    id: 'citizenship-5yr',
    category: 'Immigration',
    title: 'Statsborgerskab efter 5 år (ned fra 9)',
    description: 'Danmark har Europas strengeste regler med 9 år. En sænkning til 5 år matcher EU-gennemsnittet og kan øge tilhørsforhold og arbejdsmarkedsdeltagelse.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 0, description: 'Neutral budgeteffekt på kort sigt' }
  },

  // --- BOLIG ---
  {
    id: 'social-housing-10k',
    category: 'Bolig',
    title: 'Byg 10.000 almene boliger om året',
    description: 'Danmark mangler boliger i de store byer. Staten kan støtte almene boligselskaber med 50% tilskud — koster ca. 15 mia om året men løser boligkrise over tid.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 15, description: '+15 mia i boligstøtte' }
  },
  {
    id: 'rent-freeze',
    category: 'Bolig',
    title: 'Frys huslejer i private lejemål i 2 år',
    description: 'Huslejer er steget 15-20% på 3 år. En midlertidig huslejestop beskytter lejere men kan bremse nye investeringer i lejeboliger.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 0, description: 'Regulering — ingen direkte budgeteffekt' }
  },
  {
    id: 'mortgage-deduction-abolish',
    category: 'Bolig',
    title: 'Afskaf rentefradraget',
    description: 'Rentefradraget (ca. 30%) giver ca. 15 mia i skattefordel primært til boligejere med store lån. Afskaffelse øger provenu men rammer eksisterende boligejere.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 15, description: '+15 mia i provenu' }
  },

  // --- SUNDHED ---
  {
    id: 'free-psychology',
    category: 'Sundhed',
    title: 'Gratis psykologhjælp til alle',
    description: 'I dag er psykologhjælp enten privat (300-1200 kr/time) eller med begrænset tilskud. Universelt gratis adgang koster ca. 5–8 mia men forebygger alvorlig psykisk sygdom.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 6, description: '+6 mia i psykiatriudgifter' }
  },
  {
    id: 'health-invest-10b',
    category: 'Sundhed',
    title: 'Investér 10 mia ekstra i sundhedsvæsenet',
    description: 'Reducerer ventelister, ansætter mere personale og opgraderer udstyr. Danmark bruger relativt lidt på sundhed pr. BNP ift. Norge og Sverige.',
    options: ['Ja', 'Nej'],
    budgetImpact: { value: 10, description: '+10 mia i sundhedsudgifter' }
  }
];

const router = Router();

const votedIPs = new Set();

function getVotesPath() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  return VOTES_FILE;
}

function loadVotes() {
  try {
    const raw = readFileSync(getVotesPath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    const initial = {};
    for (const p of PROPOSALS) {
      initial[p.id] = { ja: 0, nej: 0 };
    }
    return initial;
  }
}

function saveVotes(votes) {
  try {
    writeFileSync(getVotesPath(), JSON.stringify(votes, null, 2), 'utf8');
  } catch (err) {
    console.warn('[party] Could not save votes:', err.message);
  }
}

let votes = loadVotes();

router.get('/proposals', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const result = PROPOSALS.map(p => ({
    ...p,
    votes: votes[p.id] || { ja: 0, nej: 0 }
  }));
  res.json({ proposals: result, total: PROPOSALS.length });
});

router.post('/vote', (req, res) => {
  const { proposalId, option } = req.body || {};

  if (!proposalId || !option) {
    return res.status(400).json({ error: 'proposalId og option er påkrævet' });
  }

  const proposal = PROPOSALS.find(p => p.id === proposalId);
  if (!proposal) {
    return res.status(404).json({ error: 'Forslaget findes ikke' });
  }

  const normalizedOption = String(option).toLowerCase();
  if (!['ja', 'nej'].includes(normalizedOption)) {
    return res.status(400).json({ error: 'Option skal være "ja" eller "nej"' });
  }

  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const voteKey = `${ip}::${proposalId}`;

  if (votedIPs.has(voteKey)) {
    return res.status(429).json({ error: 'Du har allerede stemt på dette forslag fra denne session' });
  }

  votedIPs.add(voteKey);

  if (!votes[proposalId]) votes[proposalId] = { ja: 0, nej: 0 };
  votes[proposalId][normalizedOption]++;

  saveVotes(votes);

  res.json({
    ok: true,
    proposalId,
    option: normalizedOption,
    votes: votes[proposalId]
  });
});

router.get('/platform', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const platform = PROPOSALS.map(p => {
    const v = votes[p.id] || { ja: 0, nej: 0 };
    const total = v.ja + v.nej;
    const jasPct = total > 0 ? Math.round(v.ja / total * 100) : 0;
    const position = total === 0 ? 'uafklaret' : (v.ja > v.nej ? 'ja' : 'nej');
    return {
      id: p.id,
      title: p.title,
      category: p.category,
      position,
      jasPct,
      total,
      budgetImpact: p.budgetImpact
    };
  });

  const adopted = platform.filter(p => p.position === 'ja');
  const totalBudgetImpact = adopted.reduce((s, p) => s + p.budgetImpact.value, 0);
  const totalVotes = platform.reduce((s, p) => s + p.total, 0);

  res.json({ platform, adopted, totalBudgetImpact, totalVotes });
});

export default router;
