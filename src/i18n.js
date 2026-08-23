/**
 * i18n.js -- the single translation dictionary.
 *
 * No visualisation component may contain a hard-coded Czech or English string.
 * Everything user-facing goes through t('key') so that switching the language
 * at runtime is a re-render, not a reload.
 *
 * Values may contain {placeholders}, filled by t('key', {placeholder: value}).
 */

export const LANGS = ['cs', 'en'];

export const translations = {
  cs: {
    /* ---- shell ---- */
    appTitle: 'Jak vzniká duha',
    appSubtitle: 'interaktivní simulace geometrické optiky',
    tabTutorial: 'Průvodce',
    tabFree: 'Volný režim',
    language: 'Jazyk',
    controls: 'Ovládání',
    explanation: 'Výklad',
    close: 'Zavřít',
    reset: 'Výchozí nastavení',
    on: 'zap',
    off: 'vyp',

    /* ---- scenes ---- */
    sceneDroplet: 'Jedna kapka',
    sceneDrops: 'Mnoho kapek',
    sceneSky: 'Obloha 3D',
    sceneDropletDesc: 'Řez jednou kulovou kapkou. Paprsek se počítá, nikoli kreslí.',
    sceneDropsDesc: 'Od jedné kapky k tisícům. Pozorovatel je vlevo.',
    sceneSkyDesc: 'Kužel směrů kolem antisolárního bodu a jeho průnik s oblohou.',

    /* ---- graphs ---- */
    graphExitAngle: 'Výstupní úhel',
    graphDistribution: 'Rozdělení paprsků',
    graphExitAngleTitle: 'Výstupní úhel v závislosti na parametru dopadu',
    graphDistributionTitle: 'Kolik paprsků odchází kterým směrem',
    axisImpact: 'parametr dopadu b/R',
    axisAngleAntisolar: 'úhel od antisolárního směru φ [°]',
    axisAngleScattering: 'rozptylový úhel Θ [°]',
    axisAngleDeviation: 'celková odchylka D [°]',
    axisRayCount: 'relativní jas (počet paprsků na úhel)',
    angleConvention: 'Zobrazený úhel',
    angleAntisolar: 'φ — od antisolárního směru',
    angleScattering: 'Θ — rozptylový úhel',
    angleDeviation: 'D — celková odchylka',
    graphHint: 'Klikněte do grafu a vyberte paprsek. Táhněte paprsek v kapce a bod se posune.',
    extremumLabel: 'extrém → duha',
    rayCount: 'Počet paprsků',
    accumulate: 'Přidávat paprsky',

    /* ---- controls: sun ---- */
    sun: 'Slunce',
    sunElevation: 'Výška Slunce nad obzorem',
    sunAzimuth: 'Azimut Slunce',
    observer: 'Pozorovatel',
    observerHeight: 'Výška pozorovatele',
    viewMode: 'Pohled',
    viewOrbit: 'Zvenčí',
    viewEye: 'Očima pozorovatele',
    lookAzimuth: 'Směr pohledu',
    lookElevation: 'Náklon pohledu',
    fieldOfView: 'Zorný úhel',

    /* ---- controls: light ---- */
    light: 'Světlo',
    wavelength: 'Vlnová délka',
    white: 'Bílé světlo',
    red: 'červená',
    orange: 'oranžová',
    yellow: 'žlutá',
    green: 'zelená',
    blue: 'modrá',
    violet: 'fialová',
    dispersion: 'Disperze',
    dispersionHint: 'Při 0 % mají všechny vlnové délky stejný index lomu — duha zbělá.',

    /* ---- controls: droplet & optics ---- */
    droplet: 'Kapka',
    dropletRadius: 'Poloměr kapky',
    dropletZoom: 'Oddálení pohledu',
    dropletZoomHint: 'Oddalte pohled a sledujte, jak se barvy paprsku rozestupují na cestě k oku pozorovatele.',
    impactParameter: 'Parametr dopadu b/R',
    reflections: 'Vnitřní odrazy',
    refractiveIndex: 'Index lomu',
    indexModel: 'Model indexu lomu',
    indexTable: 'tabulka (6 barev)',
    indexCauchy: 'Cauchyho vztah',
    indexScale: 'Násobek indexu lomu',
    optics: 'Optika',

    /* ---- controls: rays ---- */
    rays: 'Paprsky',
    showNonRainbow: 'Zobrazit paprsky mimo duhu',
    showFamilies: 'Zobrazené rodiny paprsků',
    family0: '0 odrazů',
    family1: '1 odraz (primární)',
    family2: '2 odrazy (sekundární)',
    family3: '3+ odrazy (vyšší řád)',
    rayFan: 'Svazek paprsků',
    fanCount: 'Počet paprsků ve svazku',

    /* ---- controls: visualisation ---- */
    visualization: 'Zobrazení',
    showNormals: 'Normály k povrchu',
    showAngles: 'Úhly',
    showLabels: 'Popisky',
    showWavelengthLabels: 'Popisky vlnových délek',
    showDroplets: 'Kapky',
    showCone: 'Kužel duhy',
    showAntisolar: 'Antisolární bod',
    showHorizon: 'Horizont',
    showGround: 'Země',
    showRenderedBow: 'Vykreslit duhu',
    showAlexander: 'Alexandrův temný pás',
    showPrimary: 'Primární duha',
    showSecondary: 'Vedlejší duha',
    showHigherOrder: 'Vyšší řády',
    showSky: 'Obloha',
    rainBelow: 'Déšť i pod pozorovatelem',

    /* ---- terminology ---- */
    refraction: 'lom',
    reflection: 'odraz',
    internalReflection: 'vnitřní odraz',
    angleOfIncidence: 'úhel dopadu',
    angleOfRefraction: 'úhel lomu',
    exitAngle: 'výstupní úhel',
    deviation: 'odchylka',
    caustic: 'kaustika',
    primaryRainbow: 'Primární duha',
    secondaryRainbow: 'Vedlejší duha',
    higherOrderRainbow: 'Vyšší řád duhy',
    antisolarPoint: 'Antisolární bod',
    horizon: 'horizont',
    raindrop: 'dešťová kapka',
    sunLabel: 'Slunce',
    observerLabel: 'Pozorovatel',
    antisolarLabelLong: 'antisolární bod — bod přesně proti Slunci',
    observerNoConcentration: 'bez odrazu neexistuje soustředěný směr',
    observerReachHint: 'Zvýrazněné paprsky dopadají do oka pozorovatele — ostatní míří jinam.',

    /* ---- ray info panel ---- */
    rayInfo: 'Údaje o paprsku',
    rayInfoHint: 'Klepněte na paprsek nebo táhněte parametrem dopadu.',
    infoWavelength: 'Vlnová délka',
    infoIncidence: 'Úhel dopadu θᵢ',
    infoRefraction: 'Úhel lomu θᵣ',
    infoReflections: 'Vnitřní odrazy',
    infoExitAngle: 'Úhel od antisolárního směru φ',
    infoScattering: 'Rozptylový úhel Θ',
    infoDeviation: 'Celková odchylka D',
    infoImpact: 'Parametr dopadu b/R',
    infoClassification: 'Klasifikace',
    infoIntensity: 'Relativní podíl energie',
    infoIndex: 'Index lomu n',
    infoDistanceFromBow: 'Vzdálenost od extrému',

    /* ---- classifications ---- */
    classMiss: 'MIMO KAPKU',
    classTangent: 'TEČNÝ PAPRSEK',
    classNoReflection: 'BEZ VNITŘNÍHO ODRAZU',
    classPrimary: 'RODINA PRIMÁRNÍ DUHY',
    classSecondary: 'RODINA VEDLEJŠÍ DUHY',
    classHigherOrder: 'DUHA VYŠŠÍHO ŘÁDU',
    classNonCaustic: 'BĚŽNÝ ROZPTÝLENÝ PAPRSEK',

    /* ---- labelled explanations required by the brief ---- */
    explPrimary: 'Primární duha vzniká po jednom vnitřním odrazu paprsku uvnitř kapky.',
    explSecondary:
      'Vedlejší (sekundární) duha vzniká po dvou vnitřních odrazech. Je slabší, má větší úhlový poloměr a obrácené pořadí barev.',
    explNoReflection: 'Bez vnitřního odrazu — nepřispívá k primární duze.',
    explNonCaustic: 'Jeden vnitřní odraz, ale jiný výstupní úhel — běžný rozptýlený paprsek.',
    explHigherOrder: 'Vyšší řád duhy — velmi slabý.',
    explCaustic:
      'V okolí tohoto extrému se mnoho různých paprsků odchyluje do velmi podobného směru. Světlo se proto v tomto směru výrazně koncentruje. Tento jev se nazývá kaustika.',
    explObserverHeight:
      'Úhlový poloměr duhy není dán výškou pozorovatele. Výška pozorovatele mění především to, jak velkou část kruhové duhy může zakrývat horizont.',
    explNotOneReflection:
      'Jeden vnitřní odraz sám o sobě duhu nedělá. Duha vzniká teprve tehdy, když se k jednomu vnitřnímu odrazu přidá úhlová koncentrace paprsků poblíž extrému.',
    explAlexander:
      'Mezi oběma duhami leží pás, do kterého geometrická optika neposílá žádné paprsky s jedním ani dvěma vnitřními odrazy. Proto se jeví tmavší. Není však úplně černý — světlo tam přichází z vyšších řádů, z odrazu na povrchu kapek a z běžného rozptylu v atmosféře.',
    explNotAnObject:
      'Duha není předmět v určité vzdálenosti. Každý pozorovatel dostává světlo od jiných kapek — od těch, které mu leží ve správném úhlovém směru.',

    /* ---- mathematics panel ---- */
    mathematics: 'Matematika',
    mathIntro:
      'Vše, co simulace kreslí, plyne z těchto vztahů. Žádný úhel není zadán ručně.',
    mathConventions: 'Použité úhly',
    mathConvTheta: 'θᵢ — úhel dopadu na první rozhraní, sin θᵢ = b/R',
    mathConvThetaR: 'θᵣ — úhel lomu uvnitř kapky, sin θᵢ = n · sin θᵣ',
    mathConvD:
      'D — celková odchylka: o kolik se směr paprsku otočil za celou dráhu (nesklápí se do 0–180°)',
    mathConvTheta2: 'Θ — rozptylový úhel: úhel mezi výstupním a původním směrem, sklopený do 0–180°',
    mathConvPhi: 'φ = 180° − Θ — úhel od antisolárního směru; to je úhlový poloměr duhy na obloze',
    mathWarning:
      'Tyto čtyři úhly se nesmí zaměňovat. Graf i panel vždy uvádějí, který z nich zobrazují.',
    mathDeviation: 'Odchylka po k vnitřních odrazech',
    mathDeviationNote:
      'Při vstupu i výstupu se paprsek otočí o (θᵢ − θᵣ), při každém vnitřním odrazu o (180° − 2θᵣ).',
    mathExtremum: 'Podmínka extrému',
    mathExtremumNote:
      'Derivace se položí rovna nule. Ze Snellova zákona plyne dθᵣ/dθᵢ = cos θᵢ / (n cos θᵣ), a po dosazení vyjde:',
    mathResult: 'Výsledek pro vodu',
    mathResultNote:
      'Číslo 42° tedy není konstanta geometrie — je to důsledek hodnoty indexu lomu n. Změňte n a úhel se posune.',
    mathNumericCheck: 'Nezávislá numerická kontrola',
    mathNumericNote:
      'Poloha extrému nalezená hrubou silou (zlatý řez) bez použití vzorce:',
    mathIntensityTitle: 'Odhad jasu',
    mathIntensityNote:
      'Jas se odhaduje geometricky: paprsky se vzorkují úměrně ploše (b·db), váží se nepolarizovanými Fresnelovými koeficienty (1−R)²·Rᵏ a třídí se podle φ. Dělením sin φ se z energie stane jas. Jde o výukové přiblížení — nikoli o přesný elektromagnetický výpočet.',
    mathLimits: 'Meze modelu',
    mathLimitsNote:
      'Použita je pouze geometrická optika. Simulace nepočítá interferenci, ohyb, Mieův rozptyl, vedlejší (supernumerární) oblouky ani polarizaci. Velmi malé kapky vyžadují vlnovou optiku.',

    /* ---- droplet size note ---- */
    dropletSizeNote:
      'Úhlová poloha duhy na velikosti kapky prakticky nezávisí — geometrická optika dává stejné úhly pro kapku 0,1 mm i 5 mm. Ostrost a barevnost skutečné duhy na velikosti kapek závisí, ale to je jev vlnové optiky, který tato simulace nepočítá.',

    /* ---- tutorial ---- */
    tutorial: 'Průvodce',
    step: 'Krok',
    of: 'z',
    next: 'Další',
    prev: 'Zpět',
    finish: 'Dokončit',
    startFree: 'Přejít do volného režimu',
    tutorialDone: 'Hotovo. Zbytek si zkuste sami.',

    s1title: 'Může jedna kapka udělat duhu?',
    s1body:
      'Vlevo je jediná kulová kapka v řezu. Sluneční paprsek přichází zleva. Zatím nevíme, co se s ním stane — necháme to spočítat.',
    s2title: 'Sledujte paprsek',
    s2body:
      'Táhněte posuvníkem parametru dopadu (nebo myší v kapce). Paprsek se láme podle Snellova zákona: sin θᵢ = n · sin θᵣ. Nic není nakresleno předem.',
    s3title: 'Přidejte vnitřní odraz',
    s3body:
      'Na zadní straně kapky se část světla odrazí zpět dovnitř. Přepněte počet vnitřních odrazů na 1 a sledujte dráhu R0 → R1 → R2 → R3.',
    s4title: 'Kam paprsek míří?',
    s4body:
      'Změřte úhel mezi vystupujícím paprskem a směrem od Slunce. Panel vpravo ukazuje φ — úhel od antisolárního směru.',
    s5title: 'Zkuste jiné paprsky',
    s5body:
      'Projděte celý rozsah parametru dopadu a dívejte se na graf dole. Výstupní úhel není konstantní — ale ani nestoupá donekonečna.',
    s6title: 'Proč existuje jasný směr?',
    s6body:
      'Křivka má extrém. V jeho okolí je skoro plochá, takže mnoho různých vstupních paprsků odchází téměř stejným směrem. Přepněte graf na rozdělení paprsků a přidávejte je.',
    s7title: 'Teď přidejte tisíce kapek',
    s7body:
      'Každá kapka dělá totéž. K pozorovateli se dostane světlo jen od těch kapek, které leží ve správném úhlu. Zapněte přidávání kapek.',
    s8title: 'Proč je to oblouk?',
    s8body:
      'Ve třech rozměrech tvoří všechny takové směry kužel kolem antisolárního bodu. Průnik kužele s oblohou je kružnice. Zapněte horizont a dolní část zmizí.',
    s9title: 'Odkud jsou barvy?',
    s9body:
      'Index lomu vody závisí na vlnové délce. Posuňte disperzi z 0 % na 100 % a sledujte, jak se jediný úhel rozpadne na pás barev.',
    s10title: 'Může být duh víc?',
    s10body:
      'Nastavte dva vnitřní odrazy. Vznikne slabší duha s větším poloměrem a obráceným pořadím barev. Mezi nimi zůstane Alexandrův temný pás.',

    /* ---- quiz ---- */
    quiz: 'Otázky',
    quizIntro: 'Odpovědi si můžete ověřit přímo v simulaci.',
    showAnswer: 'Ukázat odpověď',
    hideAnswer: 'Skrýt odpověď',
    q1: 'Co se stane, když paprsek projde kapkou bez vnitřního odrazu?',
    a1: 'Pokračuje dál dopředu, jen mírně odkloněný. Míří pryč od pozorovatele, který má Slunce za zády, a k primární duze nepřispívá.',
    q2: 'Dělá každý paprsek s jedním odrazem duhu?',
    a2: 'Ne. Jasná duha vzniká z úhlové koncentrace poblíž kaustiky.',
    q3: 'Proč je duha asi 42° od antisolárního směru?',
    a3: 'Protože rodina paprsků s jedním odrazem má extrém odchylky.',
    q4: 'Proč je duha kruhová?',
    a4: 'Protože příslušné výstupní směry tvoří kužel kolem antisolárního směru.',
    q5: 'Proč obvykle vidíme jen oblouk?',
    a5: 'Protože horizont a země zakrývají spodní část kružnice.',
    q6: 'Proč jsou tam barvy?',
    a6: 'Protože voda má pro různé vlnové délky různý index lomu.',
    q7: 'Proč je vedlejší duha vně primární?',
    a7: 'Dva vnitřní odrazy dávají větší úhlovou odchylku.',

    /* ---- many-droplets scene ---- */
    dropCount: 'Počet kapek',
    dropsHint:
      'Zelené kapky posílají světlo k pozorovateli, šedé ne. Rozhoduje jen úhel, ne vzdálenost.',
    dropsSunHint:
      'Posuňte výšku Slunce — rozsvítí se jiné kapky. Duha není předmět na jednom místě, je to jen úhel; jiný pozorovatel by měl svou vlastní.',
    dropsLegendReaches: 'dosáhne oka pozorovatele',
    dropsLegendMisses: 'kapka je osvětlená, ale míjí — jiný úhel',
    dropsContributing: 'Kapek přispívajících pozorovateli',
    animateDrops: 'Animovat přibývání',

    /* ---- sky scene ---- */
    skyHint: 'Táhněte myší = otáčení, kolečko = přiblížení.',
    coneAngle: 'Úhel kužele',
    visibleAbove: 'Nad horizontem',
    horizonDip: 'Pokles horizontu',
    fullCircle: 'Úplný kruh',
    flyMode: 'Let nad krajinou',
    bowTopElevation: 'Vrchol duhy nad obzorem',
    bowBelowHorizon: 'Celá primární duha je pod obzorem — Slunce je příliš vysoko.',
    fullCircleNote:
      'Nad horizontem může být celá kružnice jen tehdy, když jsou kapky i pod úrovní očí a horizont je nezakrývá. Samotná výška to nezaručí: i v kilometru klesne obzor jen asi o 1°.',
    metres: 'm',
    degrees: '°',
    nm: 'nm',

    /* ---- misc ---- */
    derivedFromSim: 'spočítáno simulací',
    notHardCoded: 'Žádná z hodnot níže není zadaná ručně.',
    reconstructTitle: 'Řetěz odvození',
    reconstructBody:
      'jednotlivé paprsky → rozdělení výstupních úhlů → kaustika → mnoho kapek → kužel v 3D → kruhová duha → horizont → viditelný oblouk',
    warningNoRender:
      'Vykreslení duhy je vypnuté. Zapněte je až tehdy, když už tušíte, proč tam bude.',
  },

  en: {
    /* ---- shell ---- */
    appTitle: 'How a rainbow forms',
    appSubtitle: 'an interactive geometric-optics simulation',
    tabTutorial: 'Tutorial',
    tabFree: 'Free mode',
    language: 'Language',
    controls: 'Controls',
    explanation: 'Explanation',
    close: 'Close',
    reset: 'Reset',
    on: 'on',
    off: 'off',

    /* ---- scenes ---- */
    sceneDroplet: 'Single droplet',
    sceneDrops: 'Many droplets',
    sceneSky: 'Sky 3D',
    sceneDropletDesc: 'Cross-section of one spherical droplet. The ray is computed, not drawn.',
    sceneDropsDesc: 'From one droplet to thousands. The observer is on the left.',
    sceneSkyDesc: 'The cone of directions around the antisolar point, and where it meets the sky.',

    /* ---- graphs ---- */
    graphExitAngle: 'Exit angle',
    graphDistribution: 'Ray distribution',
    graphExitAngleTitle: 'Exit angle versus impact parameter',
    graphDistributionTitle: 'How many rays leave in each direction',
    axisImpact: 'impact parameter b/R',
    axisAngleAntisolar: 'angle from the antisolar direction φ [°]',
    axisAngleScattering: 'scattering angle Θ [°]',
    axisAngleDeviation: 'total deviation D [°]',
    axisRayCount: 'relative brightness (rays per unit angle)',
    angleConvention: 'Angle plotted',
    angleAntisolar: 'φ — from the antisolar direction',
    angleScattering: 'Θ — scattering angle',
    angleDeviation: 'D — total deviation',
    graphHint: 'Click the graph to pick a ray. Drag the ray in the droplet and the marker follows.',
    extremumLabel: 'extremum → rainbow',
    rayCount: 'Number of rays',
    accumulate: 'Accumulate rays',

    /* ---- controls: sun ---- */
    sun: 'Sun',
    sunElevation: 'Height of Sun above horizon',
    sunAzimuth: 'Sun azimuth',
    observer: 'Observer',
    observerHeight: 'Observer height',
    viewMode: 'View',
    viewOrbit: 'From outside',
    viewEye: "Observer's eye",
    lookAzimuth: 'Looking towards',
    lookElevation: 'Look elevation',
    fieldOfView: 'Field of view',

    /* ---- controls: light ---- */
    light: 'Light',
    wavelength: 'Wavelength',
    white: 'White light',
    red: 'red',
    orange: 'orange',
    yellow: 'yellow',
    green: 'green',
    blue: 'blue',
    violet: 'violet',
    dispersion: 'Dispersion',
    dispersionHint: 'At 0 % every wavelength shares one refractive index — the bow turns white.',

    /* ---- controls: droplet & optics ---- */
    droplet: 'Droplet',
    dropletRadius: 'Droplet radius',
    dropletZoom: 'Zoom out',
    dropletZoomHint: 'Zoom out to watch the ray colours spread apart on their way to the eye.',
    impactParameter: 'Impact parameter b/R',
    reflections: 'Internal reflections',
    refractiveIndex: 'Refractive index',
    indexModel: 'Refractive-index model',
    indexTable: 'table (6 colours)',
    indexCauchy: 'Cauchy relation',
    indexScale: 'Refractive index multiplier',
    optics: 'Optics',

    /* ---- controls: rays ---- */
    rays: 'Rays',
    showNonRainbow: 'Show non-rainbow rays',
    showFamilies: 'Ray families shown',
    family0: '0 reflections',
    family1: '1 reflection (primary)',
    family2: '2 reflections (secondary)',
    family3: '3+ reflections (higher order)',
    rayFan: 'Fan of rays',
    fanCount: 'Rays in the fan',

    /* ---- controls: visualisation ---- */
    visualization: 'Visualisation',
    showNormals: 'Surface normals',
    showAngles: 'Angles',
    showLabels: 'Labels',
    showWavelengthLabels: 'Wavelength labels',
    showDroplets: 'Droplets',
    showCone: 'Rainbow cone',
    showAntisolar: 'Antisolar point',
    showHorizon: 'Horizon',
    showGround: 'Ground',
    showRenderedBow: 'Render the bow',
    showAlexander: "Alexander's dark band",
    showPrimary: 'Primary rainbow',
    showSecondary: 'Secondary rainbow',
    showHigherOrder: 'Higher orders',
    showSky: 'Sky',
    rainBelow: 'Rain below the observer too',

    /* ---- terminology ---- */
    refraction: 'refraction',
    reflection: 'reflection',
    internalReflection: 'internal reflection',
    angleOfIncidence: 'angle of incidence',
    angleOfRefraction: 'angle of refraction',
    exitAngle: 'exit angle',
    deviation: 'deviation',
    caustic: 'caustic',
    primaryRainbow: 'Primary rainbow',
    secondaryRainbow: 'Secondary rainbow',
    higherOrderRainbow: 'Higher-order rainbow',
    antisolarPoint: 'Antisolar point',
    horizon: 'horizon',
    raindrop: 'raindrop',
    sunLabel: 'Sun',
    observerLabel: 'Observer',
    antisolarLabelLong: 'antisolar point — the point directly opposite the Sun',
    observerNoConcentration: 'no concentrated direction without a reflection',
    observerReachHint: "Highlighted rays reach the observer's eye — the rest head elsewhere.",

    /* ---- ray info panel ---- */
    rayInfo: 'Ray data',
    rayInfoHint: 'Click a ray, or drag the impact parameter.',
    infoWavelength: 'Wavelength',
    infoIncidence: 'Angle of incidence θᵢ',
    infoRefraction: 'Angle of refraction θᵣ',
    infoReflections: 'Internal reflections',
    infoExitAngle: 'Angle from antisolar direction φ',
    infoScattering: 'Scattering angle Θ',
    infoDeviation: 'Total deviation D',
    infoImpact: 'Impact parameter b/R',
    infoClassification: 'Classification',
    infoIntensity: 'Relative share of energy',
    infoIndex: 'Refractive index n',
    infoDistanceFromBow: 'Distance from the extremum',

    /* ---- classifications ---- */
    classMiss: 'MISSES THE DROPLET',
    classTangent: 'TANGENT RAY',
    classNoReflection: 'NO INTERNAL REFLECTION',
    classPrimary: 'PRIMARY RAINBOW FAMILY',
    classSecondary: 'SECONDARY RAINBOW FAMILY',
    classHigherOrder: 'HIGHER-ORDER RAINBOW',
    classNonCaustic: 'OTHER / NON-CAUSTIC RAY',

    /* ---- labelled explanations required by the brief ---- */
    explPrimary:
      'The primary rainbow is produced by rays that undergo one internal reflection inside the droplet.',
    explSecondary:
      'The secondary rainbow is produced after two internal reflections. It is fainter, has a larger angular radius, and its color order is reversed.',
    explNoReflection: 'No internal reflection — does not contribute to the primary rainbow.',
    explNonCaustic: 'One internal reflection, but a different exit angle — an ordinary scattered ray.',
    explHigherOrder: 'Higher-order rainbow — very faint.',
    explCaustic:
      'Near this extremum, many different incoming rays leave the droplet in nearly the same direction. Light therefore becomes strongly concentrated in this direction. This concentration is called a caustic.',
    explObserverHeight:
      "The angular radius of the rainbow is not determined by the observer's height. Observer height mainly changes how much of the circular rainbow can be visible above the horizon.",
    explNotOneReflection:
      'One internal reflection alone does not make a rainbow. The bright bow appears only when one internal reflection is combined with the angular concentration of rays near the extremum.',
    explAlexander:
      'Between the two bows lies a band into which geometric optics sends no once- or twice-reflected rays, so it looks darker. It is not truly black: higher orders, reflection from droplet surfaces and ordinary atmospheric scattering all put some light there.',
    explNotAnObject:
      'A rainbow is not an object at some distance. Every observer receives light from a different set of droplets — the ones that happen to lie in the right angular direction.',

    /* ---- mathematics panel ---- */
    mathematics: 'Mathematics',
    mathIntro: 'Everything the simulation draws follows from these relations. No angle is entered by hand.',
    mathConventions: 'The angles used',
    mathConvTheta: 'θᵢ — angle of incidence at the first surface, sin θᵢ = b/R',
    mathConvThetaR: 'θᵣ — angle of refraction inside the droplet, sin θᵢ = n · sin θᵣ',
    mathConvD:
      'D — total deviation: how far the ray direction has turned over the whole path (never folded into 0–180°)',
    mathConvTheta2:
      'Θ — scattering angle: between the outgoing and the original direction, folded into 0–180°',
    mathConvPhi:
      'φ = 180° − Θ — angle from the antisolar direction; this is the angular radius of the bow in the sky',
    mathWarning:
      'These four angles must never be mixed. The graph and the panels always state which one they show.',
    mathDeviation: 'Deviation after k internal reflections',
    mathDeviationNote:
      'Entry and exit each turn the ray by (θᵢ − θᵣ); every internal reflection turns it by (180° − 2θᵣ).',
    mathExtremum: 'The extremum condition',
    mathExtremumNote:
      "Set the derivative to zero. Snell's law gives dθᵣ/dθᵢ = cos θᵢ / (n cos θᵣ), and substituting yields:",
    mathResult: 'Result for water',
    mathResultNote:
      'So 42° is not a constant of geometry — it is a consequence of the value of n. Change n and the angle moves.',
    mathNumericCheck: 'Independent numerical check',
    mathNumericNote:
      'The extremum located by brute force (golden-section search) without using the formula:',
    mathIntensityTitle: 'Brightness estimate',
    mathIntensityNote:
      'Brightness is estimated geometrically: rays are sampled in proportion to area (b·db), weighted by the unpolarised Fresnel factors (1−R)²·Rᵏ, and binned by φ. Dividing by sin φ turns energy into radiance. This is an educational approximation, not an exact electromagnetic calculation.',
    mathLimits: 'Limits of the model',
    mathLimitsNote:
      'Geometric optics only. The simulation does not compute interference, diffraction, Mie scattering, supernumerary bows or polarisation. Very small droplets require wave optics.',

    /* ---- droplet size note ---- */
    dropletSizeNote:
      'The angular position of the bow is essentially independent of droplet size — geometric optics gives the same angles for a 0.1 mm and a 5 mm drop. The sharpness and colour purity of a real rainbow do depend on droplet size, but that is a wave-optical effect this simulation does not compute.',

    /* ---- tutorial ---- */
    tutorial: 'Tutorial',
    step: 'Step',
    of: 'of',
    next: 'Next',
    prev: 'Back',
    finish: 'Finish',
    startFree: 'Go to free mode',
    tutorialDone: 'Done. Now try the rest yourself.',

    s1title: 'Can one raindrop create a rainbow?',
    s1body:
      'On the left is a single spherical droplet in cross-section. Sunlight arrives from the left. We do not yet know what happens to it — let the simulation work it out.',
    s2title: 'Trace the ray',
    s2body:
      "Drag the impact-parameter slider (or drag inside the droplet). The ray bends according to Snell's law: sin θᵢ = n · sin θᵣ. Nothing here is drawn in advance.",
    s3title: 'Add internal reflection',
    s3body:
      'At the back of the droplet part of the light reflects back inside. Set the number of internal reflections to 1 and follow the path R0 → R1 → R2 → R3.',
    s4title: 'Where does the outgoing ray point?',
    s4body:
      'Measure the angle between the outgoing ray and the direction away from the Sun. The panel on the right shows φ, the angle from the antisolar direction.',
    s5title: 'Try different incoming rays',
    s5body:
      'Sweep the whole range of the impact parameter and watch the graph below. The exit angle is not constant — but it does not grow without limit either.',
    s6title: 'Why is there a bright direction?',
    s6body:
      'The curve has an extremum. Near it the curve is almost flat, so many different incoming rays leave in almost the same direction. Switch the graph to the ray distribution and add rays.',
    s7title: 'Now add thousands of droplets',
    s7body:
      'Every droplet does the same thing. Light reaches the observer only from those droplets that lie at the right angle. Turn on droplet accumulation.',
    s8title: 'Why does it look like an arc?',
    s8body:
      'In three dimensions all those directions form a cone around the antisolar point. The cone meets the sky in a circle. Switch the horizon on and the lower part disappears.',
    s9title: 'Where do the colors come from?',
    s9body:
      "Water's refractive index depends on wavelength. Move dispersion from 0 % to 100 % and watch a single angle split into a band of colours.",
    s10title: 'Can there be another rainbow?',
    s10body:
      "Set two internal reflections. A fainter bow appears with a larger radius and reversed colour order, with Alexander's dark band between them.",

    /* ---- quiz ---- */
    quiz: 'Questions',
    quizIntro: 'You can check every answer in the simulation itself.',
    showAnswer: 'Show answer',
    hideAnswer: 'Hide answer',
    q1: 'What happens if the ray enters the droplet without an internal reflection?',
    a1: 'It carries on forwards, only slightly deflected. It heads away from an observer who has the Sun behind them, and contributes nothing to the primary bow.',
    q2: 'Does every one-reflection ray produce a rainbow?',
    a2: 'No. The bright rainbow results from angular concentration near the caustic.',
    q3: 'Why is the rainbow about 42° from the antisolar direction?',
    a3: 'Because the one-reflection ray family has an extremum in its deviation angle.',
    q4: 'Why is the rainbow circular?',
    a4: 'Because the relevant outgoing directions form a cone around the antisolar direction.',
    q5: 'Why do we usually see only an arc?',
    a5: 'Because the horizon and ground hide the lower part of the circle.',
    q6: 'Why are there colors?',
    a6: 'Because water has different refractive indices for different wavelengths.',
    q7: 'Why is the secondary rainbow outside the primary?',
    a7: 'Two internal reflections produce a larger angular deviation.',

    /* ---- many-droplets scene ---- */
    dropCount: 'Number of droplets',
    dropsHint:
      'Green droplets send light to the observer, grey ones do not. Only the angle matters, not the distance.',
    dropsSunHint:
      "Drag the Sun's height — different droplets light up. A rainbow isn't an object at one place, only an angle; another observer would have their own.",
    dropsLegendReaches: 'reaches the observer’s eye',
    dropsLegendMisses: 'lit too, but misses — wrong angle',
    dropsContributing: 'Droplets reaching the observer',
    animateDrops: 'Animate accumulation',

    /* ---- sky scene ---- */
    skyHint: 'Drag to rotate, scroll to zoom.',
    coneAngle: 'Cone angle',
    visibleAbove: 'Above the horizon',
    horizonDip: 'Horizon dip',
    fullCircle: 'Full circle',
    flyMode: 'Fly above the ground',
    bowTopElevation: 'Top of the bow above the horizon',
    bowBelowHorizon: 'The whole primary bow is below the horizon — the Sun is too high.',
    fullCircleNote:
      'The complete circle can only be seen when there are droplets below eye level as well and the horizon does not hide them. Altitude alone is not enough: even at one kilometre the horizon drops by only about 1°.',
    metres: 'm',
    degrees: '°',
    nm: 'nm',

    /* ---- misc ---- */
    derivedFromSim: 'computed by the simulation',
    notHardCoded: 'None of the values below is entered by hand.',
    reconstructTitle: 'The chain of reasoning',
    reconstructBody:
      'individual rays → distribution of exit angles → caustic → many droplets → 3D cone → circular rainbow → horizon → visible arc',
    warningNoRender:
      'Rendering of the bow is switched off. Turn it on once you can already predict where it will be.',
  },
};

let current = 'cs';

export function setLang(lang) {
  if (translations[lang]) current = lang;
  return current;
}
export function getLang() {
  return current;
}

/** Translate. Unknown keys fall back to English, then to the key itself. */
export function t(key, params) {
  let s = translations[current]?.[key];
  if (s === undefined) s = translations.en[key];
  if (s === undefined) return key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

/** Locale-aware number formatting (Czech uses a decimal comma). */
export function num(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const s = value.toFixed(digits);
  return current === 'cs' ? s.replace('.', ',') : s;
}

export function deg(value, digits = 1) {
  return `${num(value, digits)}°`;
}

/** Class-id -> translation key. */
export const CLASS_KEY = {
  miss: 'classMiss',
  tangent: 'classTangent',
  noReflection: 'classNoReflection',
  primary: 'classPrimary',
  secondary: 'classSecondary',
  higherOrder: 'classHigherOrder',
  nonCaustic: 'classNonCaustic',
};

/** Class-id -> the explanation the brief requires for that family. */
export const CLASS_EXPLAIN = {
  noReflection: 'explNoReflection',
  primary: 'explPrimary',
  secondary: 'explSecondary',
  higherOrder: 'explHigherOrder',
  nonCaustic: 'explNonCaustic',
};
