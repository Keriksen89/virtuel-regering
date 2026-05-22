import express from 'express';

const router = express.Router();

const governmentData = {
  folketing: {
    totalSeats: 179,
    note: 'Inkl. Grønland (2) og Færøerne (2). Baseret på valgresultat nov. 2022.',
    parties: [
      { abbr: 'A',  name: 'Socialdemokratiet',     seats: 50, color: '#E32D1C', group: 'coalition',        ideology: 'Socialdemokrati' },
      { abbr: 'V',  name: 'Venstre',               seats: 22, color: '#003F87', group: 'coalition',        ideology: 'Liberalkonservatisme' },
      { abbr: 'M',  name: 'Moderaterne',           seats: 16, color: '#6B3FA0', group: 'coalition',        ideology: 'Liberalisme, centrum' },
      { abbr: 'I',  name: 'Liberal Alliance',      seats: 22, color: '#00A0D6', group: 'opposition-right', ideology: 'Klassisk liberalisme' },
      { abbr: 'D',  name: 'Danmarksdemokraterne',  seats: 14, color: '#1B3A6B', group: 'opposition-right', ideology: 'National-konservatisme' },
      { abbr: 'F',  name: 'SF',                    seats: 15, color: '#E84B3A', group: 'opposition-left',  ideology: 'Socialistisk folkeparti' },
      { abbr: 'Ø',  name: 'Enhedslisten',          seats: 13, color: '#B22222', group: 'opposition-left',  ideology: 'Radikalt venstre' },
      { abbr: 'C',  name: 'Konservative',          seats: 10, color: '#006B3C', group: 'opposition-right', ideology: 'Konservatisme' },
      { abbr: 'B',  name: 'Radikale Venstre',      seats:  7, color: '#9B1EAD', group: 'opposition-left',  ideology: 'Socialliberalisme' },
      { abbr: 'O',  name: 'Dansk Folkeparti',      seats:  7, color: '#F4A82A', group: 'opposition-right', ideology: 'Højrepopulisme' },
      { abbr: 'Å',  name: 'Alternativet',          seats:  7, color: '#00C165', group: 'opposition-left',  ideology: 'Grøn politik' },
      { abbr: 'GL', name: 'Grønland & Færøerne',   seats:  4, color: '#888888', group: 'other',            ideology: 'Regionalt' }
    ]
  },
  government: {
    pm: { name: 'Mette Frederiksen', party: 'A', since: 'December 2022' },
    formed: 'December 2022',
    type: 'Mindretalsregering (SVM)',
    ministers: [
      { name: 'Mette Frederiksen',      title: 'Statsminister',                            ministry: 'Statsministeriet',                           party: 'A' },
      { name: 'Lars Løkke Rasmussen',   title: 'Udenrigsminister',                         ministry: 'Udenrigsministeriet',                        party: 'M' },
      { name: 'Nicolai Wammen',         title: 'Finansminister',                           ministry: 'Finansministeriet',                          party: 'A' },
      { name: 'Peter Hummelgaard',      title: 'Beskæftigelsesminister',                   ministry: 'Beskæftigelsesministeriet',                  party: 'A' },
      { name: 'Magnus Heunicke',        title: 'Justitsminister',                          ministry: 'Justitsministeriet',                         party: 'A' },
      { name: 'Sophie Løhde',           title: 'Sundhedsminister',                        ministry: 'Sundhedsministeriet',                        party: 'V' },
      { name: 'Pio Carsten',            title: 'Forsvarsminister',                        ministry: 'Forsvarsministeriet',                        party: 'V' },
      { name: 'Troels Lund Poulsen',    title: 'Erhvervsminister',                        ministry: 'Erhvervsministeriet',                        party: 'V' },
      { name: 'Jakob Ellemann-Jensen',  title: 'Bæredygtighedsminister',                  ministry: 'Ministeriet for Klima, Energi og Forsyning', party: 'V' },
      { name: 'Kaare Dybvad Bek',       title: 'Indenrigs- og boligminister',             ministry: 'Indenrigs- og Boligministeriet',             party: 'A' },
      { name: 'Mattias Tesfaye',        title: 'Udlændinge- og integrationsminister',     ministry: 'Udlændinge- og Integrationsministeriet',     party: 'A' },
      { name: 'Pernille Rosenkrantz-Theil', title: 'Undervisningsminister',               ministry: 'Undervisningsministeriet',                   party: 'A' },
      { name: 'Christina Egelund',      title: 'Minister for forskning og uddannelse',    ministry: 'Uddannelses- og Forskningsministeriet',      party: 'M' },
      { name: 'Jeppe Bruus',            title: 'Skatteminister',                          ministry: 'Skatteministeriet',                          party: 'A' },
      { name: 'Rasmus Stoklund',        title: 'Transportminister',                       ministry: 'Transportministeriet',                       party: 'A' },
      { name: 'Simon Kollerup',         title: 'Erhvervs- og byggeminister',              ministry: 'Erhvervsministeriet',                        party: 'A' },
      { name: 'Jakob Jensen',           title: 'Landbrugs- og fødevareminister',          ministry: 'Ministeriet for Landbrug, Fødevarer og Fiskeri', party: 'V' }
    ],
    coalitionAgreement: {
      title: 'Ansvar for Danmark',
      keyPoints: [
        { icon: '🏥', area: 'Sundhed',          text: 'Historisk investering i sundhedsvæsenet med afskaffelse af det groteske minuts-tyranni og mere tid til patienter.' },
        { icon: '🌍', area: 'Klima',             text: 'Bindende 70%-målsætning for CO₂-reduktion i 2030, grøn omstilling af landbrug og energiforsyning.' },
        { icon: '🛡', area: 'Forsvar',           text: 'Forsvarsbudgettet hæves til 2% af BNP som svar på Ruslands invasion af Ukraine.' },
        { icon: '🎓', area: 'Uddannelse',        text: 'Investeringer i folkeskolen, krav om minimumsnormeringer i daginstitutioner og styrket erhvervsuddannelse.' },
        { icon: '🧑‍💼', area: 'Arbejdsmarked',   text: 'Øget arbejdsudbud, reform af dagpengesystemet og bedre integration af flygtninge på arbejdsmarkedet.' },
        { icon: '🏦', area: 'Økonomi',           text: 'Ansvarlig økonomisk politik med fokus på at overholde budgetlovens rammer og reducere statsgælden på sigt.' }
      ]
    }
  },
  formation: {
    status: 'active',
    headline: 'Regeringsdannelse i gang',
    description: 'Danmark er i en overgangsfase efter nyvalg. Kongeligt udpeget forhandlingsleder leder forhandlinger om en ny regeringskoalition.',
    lastUpdated: '2026-05-22',
    note: 'Data opdateres manuelt. Følg ft.dk og dr.dk for seneste nyt.',
    timeline: [
      { label: 'Valg afholdt',                  date: '2025',          status: 'done'    },
      { label: 'Mandatfordeling opgjort',        date: '2025',          status: 'done'    },
      { label: 'Forhandlingsleder udpeget',      date: 'Forår 2026',    status: 'done'    },
      { label: 'Partier i koalitionsforhandlinger', date: 'Maj 2026',  status: 'active'  },
      { label: 'Koalitionsaftale underskrives',  date: 'Forventet 2026', status: 'pending' },
      { label: 'Ny regering præsenteres',        date: 'Forventet 2026', status: 'pending' }
    ],
    partiesInTalks: ['A', 'V', 'M', 'I', 'C', 'D'],
    sources: ['Kongehuset.dk', 'ft.dk', 'dr.dk/nyheder']
  },
  partyProfiles: [
    {
      abbr: 'A', name: 'Socialdemokratiet', color: '#E32D1C',
      leader: 'Mette Frederiksen', tagline: 'En fair og ansvarlig velfærdsstat',
      keyIssues: {
        tax:         { label: 'Skat',          stance: 'center-left' },
        welfare:     { label: 'Velfærd',       stance: 'left' },
        climate:     { label: 'Klima',         stance: 'center-left' },
        immigration: { label: 'Indvandring',   stance: 'right' },
        defense:     { label: 'Forsvar',       stance: 'center-right' },
        pension:     { label: 'Pension',       stance: 'center-left' }
      }
    },
    {
      abbr: 'V', name: 'Venstre', color: '#003F87',
      leader: 'Troels Lund Poulsen', tagline: 'Danmark i vækst og balance',
      keyIssues: {
        tax:         { label: 'Skat',          stance: 'right' },
        welfare:     { label: 'Velfærd',       stance: 'center' },
        climate:     { label: 'Klima',         stance: 'center' },
        immigration: { label: 'Indvandring',   stance: 'right' },
        defense:     { label: 'Forsvar',       stance: 'right' },
        pension:     { label: 'Pension',       stance: 'center-right' }
      }
    },
    {
      abbr: 'M', name: 'Moderaterne', color: '#6B3FA0',
      leader: 'Lars Løkke Rasmussen', tagline: 'Fornuftens vej frem',
      keyIssues: {
        tax:         { label: 'Skat',          stance: 'center-right' },
        welfare:     { label: 'Velfærd',       stance: 'center' },
        climate:     { label: 'Klima',         stance: 'center-left' },
        immigration: { label: 'Indvandring',   stance: 'center-right' },
        defense:     { label: 'Forsvar',       stance: 'right' },
        pension:     { label: 'Pension',       stance: 'center' }
      }
    },
    {
      abbr: 'I', name: 'Liberal Alliance', color: '#00A0D6',
      leader: 'Alex Vanopslagh', tagline: 'Mere frihed, lavere skat',
      keyIssues: {
        tax:         { label: 'Skat',          stance: 'far-right' },
        welfare:     { label: 'Velfærd',       stance: 'right' },
        climate:     { label: 'Klima',         stance: 'right' },
        immigration: { label: 'Indvandring',   stance: 'center-right' },
        defense:     { label: 'Forsvar',       stance: 'right' },
        pension:     { label: 'Pension',       stance: 'right' }
      }
    },
    {
      abbr: 'D', name: 'Danmarksdemokraterne', color: '#1B3A6B',
      leader: 'Inger Støjberg', tagline: 'Danmark for danskerne',
      keyIssues: {
        tax:         { label: 'Skat',          stance: 'center' },
        welfare:     { label: 'Velfærd',       stance: 'center-left' },
        climate:     { label: 'Klima',         stance: 'right' },
        immigration: { label: 'Indvandring',   stance: 'far-right' },
        defense:     { label: 'Forsvar',       stance: 'right' },
        pension:     { label: 'Pension',       stance: 'center-left' }
      }
    },
    {
      abbr: 'F', name: 'SF', color: '#E84B3A',
      leader: 'Pia Olsen Dyhr', tagline: 'Grøn velfærd og social retfærdighed',
      keyIssues: {
        tax:         { label: 'Skat',          stance: 'far-left' },
        welfare:     { label: 'Velfærd',       stance: 'far-left' },
        climate:     { label: 'Klima',         stance: 'far-left' },
        immigration: { label: 'Indvandring',   stance: 'left' },
        defense:     { label: 'Forsvar',       stance: 'left' },
        pension:     { label: 'Pension',       stance: 'left' }
      }
    },
    {
      abbr: 'Ø', name: 'Enhedslisten', color: '#B22222',
      leader: 'Mai Villadsen', tagline: 'En rød og grøn fremtid',
      keyIssues: {
        tax:         { label: 'Skat',          stance: 'far-left' },
        welfare:     { label: 'Velfærd',       stance: 'far-left' },
        climate:     { label: 'Klima',         stance: 'far-left' },
        immigration: { label: 'Indvandring',   stance: 'far-left' },
        defense:     { label: 'Forsvar',       stance: 'far-left' },
        pension:     { label: 'Pension',       stance: 'far-left' }
      }
    },
    {
      abbr: 'C', name: 'Konservative', color: '#006B3C',
      leader: 'Søren Pape Poulsen', tagline: 'Orden, frihed og ansvar',
      keyIssues: {
        tax:         { label: 'Skat',          stance: 'right' },
        welfare:     { label: 'Velfærd',       stance: 'center-right' },
        climate:     { label: 'Klima',         stance: 'center-right' },
        immigration: { label: 'Indvandring',   stance: 'right' },
        defense:     { label: 'Forsvar',       stance: 'far-right' },
        pension:     { label: 'Pension',       stance: 'center-right' }
      }
    },
    {
      abbr: 'B', name: 'Radikale Venstre', color: '#9B1EAD',
      leader: 'Martin Lidegaard', tagline: 'Frihed, mangfoldighed og grøn vækst',
      keyIssues: {
        tax:         { label: 'Skat',          stance: 'center-left' },
        welfare:     { label: 'Velfærd',       stance: 'center-left' },
        climate:     { label: 'Klima',         stance: 'left' },
        immigration: { label: 'Indvandring',   stance: 'far-left' },
        defense:     { label: 'Forsvar',       stance: 'center' },
        pension:     { label: 'Pension',       stance: 'center-left' }
      }
    },
    {
      abbr: 'O', name: 'Dansk Folkeparti', color: '#F4A82A',
      leader: 'Morten Messerschmidt', tagline: 'Danmark og danskernes parti',
      keyIssues: {
        tax:         { label: 'Skat',          stance: 'center-left' },
        welfare:     { label: 'Velfærd',       stance: 'center-left' },
        climate:     { label: 'Klima',         stance: 'right' },
        immigration: { label: 'Indvandring',   stance: 'far-right' },
        defense:     { label: 'Forsvar',       stance: 'right' },
        pension:     { label: 'Pension',       stance: 'left' }
      }
    },
    {
      abbr: 'Å', name: 'Alternativet', color: '#00C165',
      leader: 'Torsten Gejl', tagline: 'Et grønnere og mere retfærdigt samfund',
      keyIssues: {
        tax:         { label: 'Skat',          stance: 'far-left' },
        welfare:     { label: 'Velfærd',       stance: 'far-left' },
        climate:     { label: 'Klima',         stance: 'far-left' },
        immigration: { label: 'Indvandring',   stance: 'far-left' },
        defense:     { label: 'Forsvar',       stance: 'left' },
        pension:     { label: 'Pension',       stance: 'far-left' }
      }
    }
  ]
};

router.get('/data', (req, res) => {
  res.json(governmentData);
});

export default router;
