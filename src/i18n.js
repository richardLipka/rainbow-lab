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
    sceneField: 'Kapky v prostoru',
    sceneFieldDesc: 'Tisíce kapek v prostoru. Duha se poskládá sama, nikdo ji nekreslí.',
    fieldCount: 'Počet kapek v prostoru',
    fieldCountHint:
      'U každé kapky se ptáme na totéž co v plošné scéně: pod jakým úhlem ji vidíte a vychází právě tam nějaká vlnová délka? Čím víc kapek, tím zřetelnější kruh. Kreslí se přitom pořád jen kapky.',
    fieldNoCircle: 'Žádná kružnice se nekreslí — barevné jsou jen kapky, které prošly testem.',
    fieldHint: 'Táhněte myší = otáčení, kolečko = přiblížení. V pohledu okem se duha uzavře do kruhu.',
    fieldClickHint: 'Klepněte na kapku — uvidíte, kudy jí prochází světlo a pod jakými úhly.',
    fieldClearHint: 'Dalším klepnutím na tutéž kapku výběr zrušíte.',
    sceneDropletDesc: 'Řez jednou kulovou kapkou. Paprsek se počítá, nikoli kreslí.',
    sceneDropsDesc: 'Od jedné kapky k tisícům. Pozorovatel je vlevo.',
    sceneSkyDesc: 'Kužel směrů kolem antisolárního bodu a jeho průnik s oblohou.',

    /* ---- graphs ---- */
    graphExitAngle: 'Výstupní úhel',
    graphDistribution: 'Světlo podle směru',
    graphExitAngleTitle: 'Výstupní úhel v závislosti na parametru dopadu',
    graphDistributionTitle: 'Kolik světla odchází kterým směrem',
    axisImpact: 'parametr dopadu b/R',
    axisAngleAntisolar: 'úhel od antisolárního směru φ [°]',
    axisAngleScattering: 'rozptylový úhel Θ [°]',
    axisAngleDeviation: 'celková odchylka D [°]',
    axisRayCount: 'relativní jas — energie na jednotkový prostorový úhel',
    angleConvention: 'Zobrazený úhel',
    angleAntisolar: 'φ — od antisolárního směru',
    angleScattering: 'Θ — rozptylový úhel',
    angleDeviation: 'D — celková odchylka',
    graphHint: 'Klikněte do grafu a vyberte paprsek. Táhněte paprsek v kapce a bod se posune.',
    graphShow: 'Zobrazit grafy',
    graphHide: 'Skrýt grafy',
    graphCollapsedHint:
      'Výstupní úhel a rozdělení paprsků — čísla, ze kterých duhový úhel vychází.',
    graphExitExplain:
      'Každý přicházející paprsek je popsán tím, kam do kapky dopadne: b/R = 0 je přesný střed, b/R = 1 okraj. Křivka udává směr, kterým paprsek vyjde ven. V okolí svého extrému je téměř vodorovná, takže celý pás parametrů dopadu odchází skoro stejným směrem — právě tam se paprsky hromadí a ten úhel je úhlový poloměr duhy. Každá vlnová délka má svou křivku a každá se obrací u trochu jiného úhlu. Odtud pocházejí barvy.',
    graphDistExplain:
      'Vzorky dopadají náhodně po celé přední stěně kapky, každý na stejně velký kousek, takže '
      + 'každý nese stejně světla. Nesčítá se jejich počet, ale energie: kolik z nich přežije lomy '
      + 'a odrazy, rozprostřené do prostorového úhlu, kterým odcházejí. Do většiny směrů jde '
      + 'podobně málo. Do jednoho ne — tam, kde je křivka výstupního úhlu plochá, se do téhož '
      + 'směru nahrne celý pás vstupních bodů a energie vyskočí. Ten vrchol je duha a leží u '
      + 'úhlu, pod kterým ji uvidíte. Zvyšte počet vzorků a vyloupne se ze šumu sám.',
    extremumLabel: 'extrém → duha',
    rayCount: 'Počet paprsků',
    accumulate: 'Přidávat paprsky',

    /* ---- controls: sun ---- */
    sun: 'Slunce',
    dropletSizeNote:
      'Velikost kapky s úhlem skoro nic nedělá: geometrická optika dá stejných 42° pro kapku 0,1 mm '
      + 'i pro kapku 5 mm. Na velikosti závisí ostrost a sytost skutečné duhy, jenže to je vlnová '
      + 'optika, kterou tahle simulace nepočítá. Proto tu žádný ovladač velikosti nenajdete.',
    sunElevationDropletHint:
      'Stejný ovladač jako ve scénách s deštěm a oblohou. Čím výš Slunce, tím níž míří antisolární '
      + 'směr — a řez kapkou se naklápí s ním, aby obě scény seděly na sebe.',
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
    dropletZoom: 'Oddálení pohledu',
    dropletZoomHint: 'Oddalte pohled a sledujte, jak se barvy paprsku rozestupují na cestě k oku pozorovatele.',
    impactParameter: 'Parametr dopadu b/R',
    impactParameterHint:
      'Sluneční světlo přichází rovnoběžně, takže jediné, čím se paprsky liší, je místo dopadu. A protože je kapka zakřivená, tím je dané i to, pod jakým úhlem na povrch dopadnou: sin θᵢ = b/R. Jeden posuvník, dvě čísla.',
    bowRayChips: 'Skočit na duhový paprsek',
    moreDetail: 'Podrobnosti',
    reflections: 'Vnitřní odrazy',
    reflectionsHint:
      'Zvolené číslo zapne všechny řády až po něj, aby šly duhy porovnat. Políčka níž je pak můžete jednotlivě vypnout.',
    refractiveIndex: 'Index lomu',
    indexModel: 'Model indexu lomu',
    indexTable: 'tabulka (6 barev)',
    indexCauchy: 'Cauchyho vztah',
    indexScale: 'Násobek indexu lomu',
    optics: 'Optika',

    /* ---- controls: rays ---- */
    rays: 'Paprsky',
    showNonRainbow: 'Zobrazit paprsky mimo duhu',
    alexanderBandLabel: 'Alexandrův temný pás',
    rayFan: 'Svazek paprsků',
    fanCount: 'Počet paprsků ve svazku',

    /* ---- controls: visualisation ---- */
    visualization: 'Zobrazení',
    showWalls: 'Označit, co se děje na stěně',
    wallThrough: 'projde',
    wallPartial: 'odrazí se',
    wallTotal: 'úplný odraz',
    wallRemains: 'zbývá z paprsku',
    wallBudget: 'do oka dorazí z původního paprsku',
    wallNeverTotal: 'θ_r < θ_c, takže k úplnému odrazu nikdy nedojde',
    explNoTotalReflection:
      'Skoro každý výklad tvrdí, že uvnitř kapky nastává úplný vnitřní odraz. Nenastává a nastat '
      + 'nemůže. Paprsek se při vstupu láme ze θᵢ na θᵣ, přičemž sin θᵣ = sin θᵢ / n, takže θᵣ '
      + 'nikdy nepřeleze asin(1/n) — a to je přesně mezní úhel {crit}. Na zadní stěnu dopadá pod '
      + 'týmž θᵣ, tedy pod mezním úhlem. U hlavní duhy je to {theta} a stěna odrazí {refl} světla. '
      + 'Zbytek odejde ven. Proto ty čárkované pahýly: na každé stěně uniká víc světla, než pokračuje dál.',
    showNormals: 'Normály k povrchu',
    showAngles: 'Úhly',
    showLabels: 'Popisky',
    showWavelengthLabels: 'Popisky vlnových délek',
    showDroplets: 'Kapky',
    showCone: 'Kužel duhy',
    showAntisolar: 'Antisolární bod',
    showHorizon: 'Obzor',
    showGround: 'Země',
    showRenderedBow: 'Vykreslit duhu',
    showArrival: 'Oblouk výstupních směrů',
    showAlexander: 'Alexandrův temný pás',
    showPrimary: 'Primární duha',
    showSecondary: 'Vedlejší duha',
    showHigherOrder: 'Vyšší řády',
    showSky: 'Obloha',
    showAirObserver: 'Ukázat, co vidí letadlo',
    airHeight: 'Výška letadla',
    airHeightHint:
      'Druhý pozorovatel, letící nad přeháňkou. Čárkovaně je dokreslená ta část téhož '
      + 'oblouku, na kterou on dosáhne a vy ze země ne — pod sebou má déšť, vy tam máte zem.',
    airObserverSees: 'z letadla ve výšce',
    rainBelow: 'Déšť i pod úrovní očí',

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
    horizon: 'obzor',
    raindrop: 'dešťová kapka',
    sunLabel: 'Slunce',
    observerLabel: 'Pozorovatel',
    antisolarLabelLong: 'antisolární bod — bod přesně proti Slunci',
    observerNoConcentration: 'bez odrazu neexistuje soustředěný směr',
    observerReachHint: 'Zvýrazněné paprsky dopadají do oka pozorovatele — ostatní míří jinam.',
    rayTally: 'Paprsků do oka',
    rayLegendReaches: 'tvoří duhu',
    rayLegendMisses: 'míří mimo pozorovatele',

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
    infoSwing: 'O kolik se φ pohne na 0,01 b',
    infoSwingStopped: 'stojí — tady je duha',
    arrivalArcLabel: 'kam paprsky odcházejí',
    arrivalArcHint:
      'Každá čárka je jeden paprsek ze svazku, položená na směr, kterým odešel. Tam, kde se čárky nakupí, se směr přestal měnit — a právě to je duha. Jinde se rozestupují, protože každý paprsek míří jinam.',

    /* ---- classifications ---- */
    classMiss: 'MIMO KAPKU',
    classTangent: 'TEČNÝ PAPRSEK',
    classNoReflection: 'BEZ VNITŘNÍHO ODRAZU',
    classPrimary: 'RODINA PRIMÁRNÍ DUHY',
    classSecondary: 'RODINA VEDLEJŠÍ DUHY',
    classHigherOrder: 'DUHA VYŠŠÍHO ŘÁDU',
    classNonCaustic: 'BĚŽNÝ ROZPTÝLENÝ PAPRSEK',

    /* ---- labelled explanations required by the brief ---- */
    explPrimary:
      'Jeden vnitřní odraz uvnitř kapky, a jenom jeden. To je primární duha — nejjasnější ze všech, protože se z paprsku zatím nic dalšího nezahodilo.',
    explSecondary:
      'Vedlejší duha vzniká po dvou vnitřních odrazech. Její křivka výstupního úhlu klesá do sedla tam, kde primární stoupá k vrcholu — a odtud je jak větší poloměr, tak obrácené pořadí barev. Odraz navíc stojí zvlášť: zahodí většinu světla.',
    explNoReflection: 'Bez vnitřního odrazu — nepřispívá k primární duze.',
    explNonCaustic:
      'Odrazy tam jsou, výstupní úhel ne. Tenhle paprsek odchází daleko od extrému, takže se rozptýlí jako každý jiný a k žádné duze nepřispívá.',
    explHigherOrder:
      'Tři odrazy a víc. Zbude zlomek toho, co má primární duha, a vrací se na opačnou stranu oblohy — vedle Slunce, ne proti němu.',
    distSamples: 'vzorků',
    explEnergyPlot:
      'Tenhle graf není histogram paprsků, je to energie. Každý vzorek padne na stejně velký '
      + 'kousek přední stěny kapky, takže nese stejně světla; váží se Fresnelovým rozpočtem '
      + '(1−R)²·R^k, tedy tím, co z něj po odrazech zbude; a dělí se prostorovým úhlem prstence, '
      + 'do kterého odejde. Výška křivky je proto jas v daném směru. Odtud ten ostrý vrchol na '
      + '42° a nula hned za ním — za hlavní duhu se po jednom odrazu nedostane vůbec nic.',
    explCaustic:
      'Tam, kde se křivka zplošťuje, odchází celý pás vstupních bodů skoro jedním směrem, takže '
      + 'se jejich světlo složí do stejného úzkého výseku oblohy. Takovému nahromadění se v '
      + 'optice říká kaustika. Světlé čáry na dně bazénu jsou totéž.',
    explObserverHeight:
      'Úhlový poloměr duhy nezávisí na výšce pozorovatele. Výška mění jen to, jak velkou část kruhu může zakrýt obzor.',
    explNotOneReflection:
      'Jeden vnitřní odraz sám o sobě duhu nedělá. Duha vzniká teprve tehdy, když se k jednomu vnitřnímu odrazu přidá úhlová koncentrace paprsků poblíž extrému.',
    explAlexander:
      'Mezi oběma duhami leží pás, kam se žádný paprsek s jedním ani dvěma odrazy nedostane. Primární křivka se obrací u {inner} a vedlejší u {outer}, obě pryč od mezery — proto je tmavší. Úplně černý ale není: světlo tam přichází z vyšších řádů, z odrazu na povrchu kapek a z běžného rozptylu v atmosféře.',
    explNotAnObject:
      'Duha není předmět v určité vzdálenosti. Každý pozorovatel dostává světlo od jiných kapek — od těch, které mu leží ve správném úhlovém směru.',

    /* ---- which reflection count makes which bow ---- */
    bowName0: 'žádná duha',
    bowName1: 'primární duha',
    bowName2: 'vedlejší duha',
    bowName3: 'terciární duha',
    bowNameK: 'duha {k}. řádu',
    bowFromAntisolar: 'od antisolárního bodu',
    bowFromSun: 'od Slunce',
    dropletBowLine: 'k = {k} → {bow} · {angle} {side}',
    dropletBowNone: 'k = 0 → bez vnitřního odrazu, duha nevznikne',
    bowLedgerTitle: 'Který odraz dělá kterou duhu',
    bowLedgerLight: 'zbývá světla',
    bowLedgerVs: 'proti primární',
    bowLedgerNote:
      'Uvedené procento je čistý Fresnel: (1−R)²·Rᵏ pod vlastním úhlem dopadu té které duhy. Rozprostření na širší pás a větší prstenec ubere dál.',
    explWhyFainter:
      'Každý odraz navíc něco stojí — a není to málo, protože povrch vody je zevnitř mizerné zrcadlo. Pod úhlem primární duhy vrátí zpátky jen {r1} toho, co na něj dopadne, a zbytek pustí rovnou ven. Celá primární duha stojí na tomhle zlomku. Vyžádejte si druhý odraz a zbude vám zlomek ze zlomku: {rel2} světla primární duhy. Pak si ukousne i geometrie — vedlejší duha leží na větším prstenci a rozetře tytéž barvy skoro přes dvojnásobný úhel.',
    explReflectionIsWeak:
      'V kapce se nic neodráží proto, že by muselo. Mezní úhel vody je {crit}, duhový paprsek dopadá na zadní stěnu zevnitř pod úhlem {theta}, tedy hluboko pod ním — povrch má volnou ruku světlo pustit ven, a pustí. Většina odejde na místě. Co zůstane, je duha.',

    /* ---- 3-D field: why this droplet and not the one beside it ---- */
    fieldPickInfo: 'Vybraná kapka',
    fieldBandsTitle: 'Kde který řád vychází',
    bowLedgerBow: 'duha',
    fieldTestNote:
      'Celý test je jediná otázka: pod jakým úhlem od antisolárního bodu tu kapku vidíte? Když v tom úhlu právě vychází nějaká vlnová délka (±{tol}), kapka se obarví. Na vzdálenost se nikdo neptá — proto je v tabulce jen pro zajímavost.',
    fieldDelivers: 'Posílá vám {nm} nm ({color}) — {bow}.',
    fieldDeliversNone: 'Neposílá vám nic. Nejbližší duhový pás míjí o {delta}.',
    fieldHiddenOrder:
      'Úhel by seděl, jenže {bow} máte vypnutou. Zapněte ji a kapka se rozsvítí.',
    fieldWhyNote:
      'Sousední kapka o kousek vedle je vidět pod jiným úhlem, takže z ní vyjde jiná vlnová délka — nebo žádná. Odtud ta barevná kružnice: není nakreslená, jsou to prostě všechny směry, které svírají tentýž úhel s osou.',
    fieldLitOfShown: 'Svítí {lit} z {shown} kapek',
    fieldTestLine: 'Test: úhel od antisolárního bodu ±{tol}. Vzdálenost se nepočítá.',

    /* ---- the cross-section cuts a cone, so every family has two rays ---- */
    coneSliceNote:
      'Všechno tohle dělá jediný paprsek. Co se na první stěně lomem dostane ven, je primární duha. Co zůstane uvnitř a doletí na další stěnu, je vedlejší. Co zůstane znovu, je třetí řád. Jeden paprsek, jeden vstupní bod — řády se z něj odlupují stěnu po stěně a každý si bere zlomek toho, co předchozí nechal být. Tohle je příčina vedlejší duhy a na nic z toho není potřeba druhý paprsek.',
    coneOtherSide: 'druhá strana kužele',
    entryHalvesNote:
      'Obě oči stojí na téže straně, protože každý řád vchází svou polovinou kapky — a to je '
      + 'jediný způsob, jak obě světla pošlete jednomu pozorovateli, protože strana výstupu se s '
      + 'každým odrazem překlápí. Čtěte u každého oka jeho vlastní φ od čárkované antisolární '
      + 'přímky: {phi1} a {phi2}, tedy {gap} od sebe. Ten rozdíl je to, co vidíte na obloze.',

    explBowNeedsOwnRay:
      'Jeden paprsek ukazuje, jak vedlejší duha vzniká. Neukazuje ji samotnou. Duha je nahromadění paprsků a každý řád se hromadí u svého vlastního parametru dopadu — {b1} pro primární, {b2} pro vedlejší. Přetáhněte posuvník mezi nimi a dívejte se, které oko se rozsvítí. Vždycky jen jedno.',
    explOppositeHalves:
      'Aby obě duhy dorazily do jednoho oka, musí každá vejít jinou polovinou kapky. '
      + 'Primární vstupuje horem při b = +{b1}, odrazí se jednou a míří dolů. Vedlejší vstupuje '
      + 'spodem při b = −{b2}, odrazí se dvakrát a míří dolů taky. Stejná polovina u obou by jednu '
      + 'z nich poslala nahoru, pryč od pozorovatele. Proto to nejsou dva paprsky odnikud, ale dvě '
      + 'různé dráhy dvěma různými místy dopadu.',
    explSameSplitInSky:
      'Tentýž rozpad, jenže venku. Každá kapka dělá to co ta jediná v řezu: všechny řády naráz, každý jinam. Který z nich dorazí k vám, rozhoduje jedině to, kde kapka stojí — takže kapka, ze které máte primární duhu, vám tu vedlejší udělat nemůže. Ta je z úplně jiných kapek.',

    /* ---- the secondary, built rather than announced ---- */
    s13atitle: 'Tentýž paprsek, o odraz dál',
    s13abody:
      'Do kapky nevstupuje nic nového. Ten čárkovaný pahýl na první stěně je primární duha, jak '
      + 'odchází; co zůstalo uvnitř a doletělo na další stěnu, dělá vedlejší. Obě větve jsou na '
      + 'obrázku naráz. Teď najděte paprsek, kterému vedlejší duha patří — čipy skáčou mezi oběma '
      + 'vstupními polohami, a ty leží v opačných polovinách kapky. Dívejte se, které oko se '
      + 'rozsvítí. Vždycky jen jedno.',
    s13btitle: 'Proč se barvy obracejí',
    s13bbody:
      'Každá barva má svůj vlastní úhel, protože má svůj index lomu. Červená u jednoho odrazu '
      + 'končí na 42,2°, fialová na 40,5° — červená je dál od antisolárního bodu, takže leží '
      + 'na vnějším okraji duhy. '
      + 'U dvou odrazů je červená na 50,7° a fialová na 53,7°, takže je to naopak: fialová je dál, '
      + 'červená blíž. Na grafu je vidět proč. Primární křivka má vrchol a ten vrchol je pro '
      + 'červenou výš; vedlejší má sedlo a to sedlo je pro červenou níž. Stejná disperze, '
      + 'obrácené pořadí.',
    explColourFlip:
      'Červená se v primární duze obrací u {p1} a ve vedlejší u {p2}, fialová u {v1} a u {v2}. Jedna křivka má vrchol, druhá sedlo — a tentýž rozptyl indexu lomu proto naskládá barvy jednou takhle a podruhé obráceně. Mezera mezi nimi, {gap} oblohy, je prázdná ze stejného důvodu: obě křivky se od ní odvracejí, takže do ní žádný paprsek s jedním ani dvěma odrazy nedopadne.',
    turnMax: 'vrchol',
    turnMin: 'sedlo',
    turnRedOutside: 'červená vně',
    turnRedInside: 'červená uvnitř',

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
      'Simulace počítá jen geometrickou optiku. Nepočítá interferenci, ohyb, Mieův rozptyl, vedlejší (supernumerární) oblouky ani polarizaci. Velmi malé kapky vyžadují vlnovou optiku.',

    /* ---- droplet size note ---- */

    /* ---- tutorial ---- */
    tutorial: 'Průvodce',
    step: 'Krok',
    of: 'z',
    next: 'Další',
    prev: 'Zpět',
    finish: 'Dokončit',
    startFree: 'Přejít do volného režimu',
    tutorialDone: 'Hotovo. Zbytek si zkuste sami.',

    s1title: 'Dvě duhy, osm stupňů',
    s1body:
      'Tohle je cíl. Jedna kulová kapka v řezu, sluneční světlo zleva a dvě oči: jedno 42,4° od '
      + 'antisolárního bodu, druhé 50,4°. Mezi nimi je pás, do kterého nevychází nic. Každá duha '
      + 'přitom potřebuje jiný paprsek — vstupuje jinou výškou a uvnitř se odrazí jinak často. '
      + 'Zkuste přepnout mezi oběma vstupními body. Zbytek prohlídky rozebírá, proč to tak je.',
    s1btitle: 'Může jedna kapka udělat duhu?',
    s1bbody:
      'Zpátky na začátek, s prázdným obrázkem. Jedna kulová kapka v řezu, jeden paprsek zleva a '
      + 'zatím ani jeden odraz. Odsud se k těm dvěma duhám dopracujeme krok za krokem — nic '
      + 'z toho, co uvidíte, není nakreslené dopředu.',
    s2title: 'Sledujte paprsek',
    s2body:
      'Táhněte posuvníkem parametru dopadu, nebo myší přímo v kapce. Kde paprsek dopadne, '
      + 'rozhoduje o všem: povrch koule se od středu k okraji odklání, takže posun vstupního '
      + 'bodu mění úhel, pod kterým paprsek na stěnu narazí. Zbytek udělá Snellův zákon: '
      + 'sin θᵢ = n · sin θᵣ.',
    s3title: 'Přidejte vnitřní odraz',
    s3body:
      'Na zadní stěně se část světla odrazí zpět dovnitř. Jak velká? Značky na stěnách to říkají '
      + 'pro tenhle paprsek: kolik projde, kolik se odrazí, a ten čárkovaný pahýl je světlo, '
      + 'které tam uniklo ven. Pod každým číslem je druhé — kolik z původního paprsku ještě '
      + 'zbývá. Táhněte posuvníkem a obě čísla se mění s úhlem dopadu. '
      + 'Sledujte dráhu R0 → R1 → R2 → R3 a čísla zároveň.',
    s4title: 'Kam paprsek míří?',
    s4body:
      'Paprsek někam odchází. Úhel, který má smysl číst, se ale neměří u kapky, ale u vás: '
      + 'postavte se zády ke Slunci a φ je úhel mezi kapkou a bodem přesně proti Slunci — tedy '
      + 'stínem vaší hlavy. Panel vpravo ho ukazuje.',
    s5title: 'Zkuste jiné paprsky',
    s5body:
      'Projděte celý rozsah parametru dopadu a dívejte se na graf dole. Nejde o to, že někde je '
      + 'úhel největší — jde o to, že tam je křivka vodorovná. Plochá křivka znamená, že celý pás '
      + 'vstupních bodů odejde skoro stejným směrem. Jinde se úhel při každém posunu mění a světlo '
      + 'se rozprostře. Jestli je ten plochý bod vrchol nebo sedlo, na tom nezáleží: u jednoho '
      + 'odrazu '
      + 'vyjde vrchol, u dvou sedlo, a duha je v obou případech tam, kde se křivka obrací.',
    s7title: 'Proč existuje jasný směr?',
    s7body:
      'Totéž ploché místo, teď spočítané. Graf dole sčítá světlo odcházející každým směrem — ne '
      + 'kolik paprsků, ale kolik energie. Mimo duhu se světlo rozprostře natenko. V plochém '
      + 'místě spadne celý pás vstupních bodů do úzkého rozmezí úhlů a křivka vyskočí. Zvyšte '
      + 'počet vzorků a vrchol se vyloupne ze šumu.',
    s8title: 'Teď přidejte tisíce kapek',
    s8body:
      'Každá kapka dělá totéž. K pozorovateli se dostane světlo jen od těch kapek, které leží ve správném úhlu. Přidávejte kapky a sledujte, jak oblouk houstne.',
    s10title: 'Tytéž kapky, ale v prostoru',
    s10body:
      'Stejná otázka, jen bez řezu: u každé kapky kolem vás se ptáme, pod jakým úhlem ji vidíte a jestli právě tam nějaká vlnová délka vychází. Žádná kružnice se nekreslí. Barevné jsou jen kapky, které prošly testem — a oblouk z nich stejně vyjde.',
    explFieldAssembles:
      'Přidejte kapky a oblouk zhoustne, uberte je a rozpadne se na jednotlivé body. Duha není nakreslený tvar, je to statistika: kolik kapek náhodou stojí ve správném směru.',
    s11title: 'Proč je to oblouk?',
    s11body:
      'Ve třech rozměrech tvoří všechny takové směry kužel kolem antisolárního bodu. Průnik kužele s oblohou je kružnice. Zapněte obzor a dolní část zmizí.',
    s11btitle: 'Proč oblouk, a ne kruh',
    s11bbody:
      'Ze země uvidíte zhruba 40 % kruhu. Zbytek je pod obzorem a stojí v něm země. Výška sama '
      + 'skoro nepomůže — deset kilometrů nad zemí sníží obzor o pouhé 3,2°. Rozhoduje něco jiného: '
      + 'jestli je déšť i pod vámi. Zapněte ho a stoupejte. Kolem 1,7 km se kruh uzavře.',
    explFullCircle:
      'Duha je vždycky celý kruh. Ze země z něj vidíte horní část, protože antisolární bod leží '
      + 'pod obzorem — při Slunci 15° nad obzorem sahá oblouk od +27,2° do −57,2° a pod nulou je '
      + 'zem. Spodní část kruhu tvoří kapky pod úrovní očí a jejich světlo míří k vám vzhůru. '
      + 'Z letadla, z útesu nebo nad tříští vodopádu tam ty kapky jsou, a kruh se uzavře.',
    explArrivalArc:
      'Oblouk nad kapkou počítá výstupní směry. Není to nakreslená duha — je to hustota: kolikrát '
      + 'paprsky odejdou právě tímhle směrem. Ve většině směrů skoro nic, v jednom hrb. '
      + 'Ten hrb je duha a jediný paprsek ho ukázat nedokáže.',
    s11ctitle: 'Co vidí letadlo',
    s11cbody:
      'Stejná obloha, dva pozorovatelé. Vy stojíte na louce. Čárkovaně je zbytek téhož oblouku — '
      + 'ta část, na kterou dosáhne někdo letící ve třech kilometrech, a vy ne. Na světle se nic '
      + 'nezměnilo: duha je pro oba stejných 42° od antisolárního bodu. Změnilo se, co je pod '
      + 'vámi. On tam má déšť, vy zem. Vedlejší duha dělá totéž o osm stupňů dál.',
    explAirObserver:
      'Kapky, které tvoří čárkovanou část, leží pod úrovní očí, takže jejich světlo míří vzhůru. '
      + 'Na zemi je nikdo nechytí — tam, kde by musely být, je zem. Z letadla ano, a kruh se '
      + 'uzavře. HyperPhysics to říká naplno: celý kruh duhy je z letadla vidět proto, že kapky '
      + 'můžou padat i pod vámi.',
    s12title: 'Odkud jsou barvy?',
    s12body:
      'Index lomu vody závisí na vlnové délce. Posuňte disperzi z 0 % na 100 % a jediný úhel se rozpadne na pás barev. Graf dole se rozpadne s ním — na jednu křivku pro každou vlnovou délku.',
    s13ctitle: 'Pás, do kterého nic nepřijde',
    s13cbody:
      'Paprsek je nastavený na vedlejší duhu, a proto vstupuje spodní polovinou kapky — jen odtud '
      + 'odejde po dvou odrazech dolů k pozorovateli. Horní polovinou by odešel nahoru, pryč. '
      + 'Primární duha to má opačně. Proto jsou obě oči na stejné straně, 8° od sebe, a mezi nimi '
      + 'zůstane klín, do kterého nevychází nic — ani po jednom odrazu, ani po dvou, při žádném '
      + 'místě dopadu. To je Alexandrův temný pás.',
    s13title: 'Může být duh víc?',
    s13body:
      'A takhle to dopadne na obloze. Pás leží přesně mezi červeným okrajem hlavní duhy na 42,4° '
      + 'a červeným okrajem vedlejší na 50,4° — ano, je to ta mezera mezi dvěma červenými kruhy. '
      + 'Temný je proto, že ven z kapky tam nemíří nic: za hlavní duhu se po jednom odrazu '
      + 'nedostane nic a před vedlejší se po dvou nedostane nic. Vypněte a zapněte stínování pásu '
      + 'a porovnejte ho s oblohou vně vedlejší duhy — tam světlo je, jen slabé.',

/* ---- controls: the observer ---- */
    observerGroup: 'Pozorovatel',
    observerDepth: 'Pozorovatel — dopředu / dozadu',
    observerRise: 'Pozorovatel — nahoru / dolů',
    observerMoveHint:
      'Posunutím pozorovatele se změní úhly ke všem kapkám, takže duhu začne tvořit jiná skupina kapek. Pozorovatele lze také přetáhnout myší v obrázku.',
    observerRecentre: 'Zpět na výchozí místo',
    indexGroup: 'Index lomu (pokročilé)',
    observerOnBow: '✓ přesně na duze',
    dropsMoveHint: 'Přetáhněte pozorovatele — duha se přesune s vámi na jiné kapky.',
    obsChipForward: 'dál do deště',
    obsChipUp: 'výš',
    obsChipDown: 'níž',

    /* ---- tutorial: the two observer steps ---- */
    s6title: 'Přidávejte paprsky',
    s6body:
      'Čtyři rovnoběžné paprsky, čtyři různé směry ven. Nic zvláštního. Přidejte jich šestnáct a pak šedesát '
      + 'a sledujte, kde se začnou hromadit. Většina směrů zůstane skoro prázdná, jeden se zaplní. '
      + 'Tam je oko. Duha není směr, kterým letí paprsek, ale směr, kterým jich letí naráz mnoho.',
    explObserverAngle:
      'Úhel φ se měří u pozorovatele: mezi pohledem na kapku a antisolárním směrem, tedy směrem, kterým sluneční světlo letělo dál. Je to přesně totéž φ, které ukazuje výpis u výstupu paprsku.',
    s9title: 'Duha není na jednom místě',
    s9body:
      'Ani jedna kapka se nepohne. Mění se jen to, kde stojíte vy. Posuňte pozorovatele a duhu začne tvořit úplně jiná skupina kapek — rozhoduje totiž výhradně úhel, pod kterým je vidíte.',
    explBowFollowsYou:
      'Proto k duze nelze dojít a proto ji každý vidí na jiných kapkách. Vaše duha je jen vaše.',
    explDispersionZoom:
      'Oddálením se kapka zmenší, ale úhlový rozestup barev zůstane stejný — proto se z jednoho paprsku stane viditelně barevný vějíř.',

/* ---- export & footer ---- */
    exportPng: 'Uložit PNG',
    exportPngHint: 'Uloží tento obrázek v trojnásobném rozlišení, včetně popisku.',
    exportWorking: 'ukládám…',
    exportSaved: 'uloženo',
    exportDeclined: 'zrušeno',
    exportFailed: 'nepodařilo se uložit',
    favFaculty: 'Fakulta aplikovaných věd, Západočeská univerzita v Plzni',

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
    a5: 'Protože obzor a země zakrývají spodní část kružnice.',
    q6: 'Proč jsou tam barvy?',
    a6: 'Protože voda má pro různé vlnové délky různý index lomu.',
    q7: 'Proč je vedlejší duha vně primární?',
    a7: 'Dva vnitřní odrazy dávají větší úhlovou odchylku.',

    /* ---- many-droplets scene ---- */
    dropCount: 'Počet kapek',
    dropsHint:
      'Zelené kapky posílají světlo k pozorovateli, šedé ne. Rozhoduje jen úhel, ne vzdálenost.',
    dropsSunHint:
      'Změňte výšku Slunce — rozsvítí se jiné kapky. Duha není předmět na jednom místě, je to jen úhel. Jiný pozorovatel by měl svou vlastní.',
    dropsLegendReaches: 'dosáhne oka pozorovatele',
    dropsLegendMisses: 'osvětlená taky, ale míjí oko — jiný úhel',
    dropsContributing: 'Kapek přispívajících pozorovateli',

    /* ---- many droplets: inspecting one of them ---- */
    dropsClickHint: 'Klepněte na kapku — uvidíte všechny její paprsky i úhly.',
    dropsClearHint: 'Klepnutím mimo kapku výběr zrušíte.',
    dropIncoming: 'sluneční světlo',
    dropHits: 'φ {angle} — míří do oka',
    dropMisses: 'φ {angle} — oko míjí',
    dropInfo: 'Vybraná kapka',
    dropSeenAt: 'Úhel od antisolárního směru φ',
    dropDistanceRow: 'Vzdálenost od pozorovatele',
    dropDistanceNote:
      'Vzdálenost se ve výpočtu nikde neobjeví. Rozhoduje jen směr — proto duha není předmět na určitém místě.',
    dropOrdersTitle: 'Kam kapka posílá soustředěné světlo',
    dropDelivers: 'Do oka posílá {color} — {bow}.',
    dropDeliversNone: 'Do oka neposílá nic — nejbližší duhový směr míjí o {delta}.',
    dropPhiThetaNote:
      'Θ je úhel, o který kapka světlo stočí; φ = 180° − Θ je úhel, pod kterým musí být kapka vidět. V obrázku je proto Θ vyneseno u kapky a φ u oka.',
    dropHigherNote:
      'Třetí odraz vychází až u φ ≈ {phi}, tedy asi {fromSun} od Slunce — dopředu do deště, ne zpátky k pozorovateli. Proto terciární duhu na obloze proti Slunci nikdy nenajdete.',
    dropInfoHint: 'Klepnutím na jinou kapku v obrázku vyberete jinou.',
    dropClear: 'Zrušit výběr',
    animateDrops: 'Přidávat kapky postupně',

    /* ---- sky scene ---- */
    skyHint: 'Táhněte myší = otáčení, kolečko = přiblížení.',

    /* ---- 3-D sky: tracing one beam ---- */
    skyClickHint: 'Klepněte na duhu — uvidíte, kudy k vám letí jeden paprsek.',
    skyClearHint: 'Klepnutím mimo duhu výběr zrušíte.',
    skyPickInfo: 'Vybraný paprsek',
    skyPickOrder: 'Vnitřních odrazů k',
    skyPickElevation: 'Výška nad obzorem',
    skyPickRoll: 'Poloha na kružnici',
    skyPickNote:
      'Kapka v tomto směru dostává sluneční světlo jako všechny ostatní. Řád k = {k} z ní vychází přesně pod tím úhlem, pod kterým se na ni díváte, a doletí vám do oka. Ostatní řády opouštějí tutéž kapku jinam — proto v jednom směru vidíte vždy jen jeden řád a vedlejší duhu vám tvoří úplně jiné kapky.',
    skyPickOthers: 'Kam z téže kapky míří ostatní řády',
    skyPickMiss: 'míjí oko o {delta}',
    skyPickReaches: 'trefí oko',
    skyPickClear: 'Zrušit výběr',
    skyPickBelowHorizon:
      'Tento směr je pod obzorem, takže tam žádný déšť nevidíte a paprsek se nekreslí. Snižte Slunce nebo zapněte déšť pod úrovní očí.',
    coneAngle: 'Úhel kužele',
    bowVisible: 'Viditelná část duhy',
    rainSeenBelow: 'Déšť pod obzorem',
    horizonDip: 'Pokles obzoru',
    horizonOfObserver: 'obzor pozorovatele',
    groundLevel: 'úroveň země',
    fullCircle: 'Úplný kruh',
    flyMode: 'Let nad krajinou',
    bowTopElevation: 'Vrchol duhy nad obzorem',
    bowBelowHorizon: 'Celá primární duha je pod obzorem — Slunce je příliš vysoko.',
    fullCircleNote:
      'Celá kružnice může být nad obzorem jen tehdy, když jsou kapky i pod úrovní očí a obzor je nezakrývá. Samotná výška to nezaručí: ani z kilometru neklesne obzor víc než asi o 1°.',
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
      'Vykreslení duhy je vypnuté. Zapněte je, až budete umět odhadnout, kde duha bude.',
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
    sceneField: 'Droplets in space',
    sceneFieldDesc: 'Thousands of droplets in space. The bow assembles itself; nothing draws it.',
    fieldCount: 'Number of droplets in space',
    fieldCountHint:
      'Every droplet gets the same question as in the flat scene: at what angle do you see it, and does some wavelength come out exactly there? More droplets, a cleaner circle. Only droplets are ever drawn.',
    fieldNoCircle: 'No circle is drawn — the coloured dots are the droplets that passed the test.',
    fieldHint: 'Drag to orbit, scroll to zoom. In the eye view the bow closes into a ring.',
    fieldClickHint: 'Click a droplet to see the light passing through it, and at what angles.',
    fieldClearHint: 'Click the same droplet again to clear the selection.',
    sceneDropletDesc: 'Cross-section of one spherical droplet. The ray is computed, not drawn.',
    sceneDropsDesc: 'From one droplet to thousands. The observer is on the left.',
    sceneSkyDesc: 'The cone of directions around the antisolar point, and where it meets the sky.',

    /* ---- graphs ---- */
    graphExitAngle: 'Exit angle',
    graphDistribution: 'Light by direction',
    graphExitAngleTitle: 'Exit angle versus impact parameter',
    graphDistributionTitle: 'How much light leaves in each direction',
    axisImpact: 'impact parameter b/R',
    axisAngleAntisolar: 'angle from the antisolar direction φ [°]',
    axisAngleScattering: 'scattering angle Θ [°]',
    axisAngleDeviation: 'total deviation D [°]',
    axisRayCount: 'relative brightness — energy per unit solid angle',
    angleConvention: 'Angle plotted',
    angleAntisolar: 'φ — from the antisolar direction',
    angleScattering: 'Θ — scattering angle',
    angleDeviation: 'D — total deviation',
    graphHint: 'Click the graph to pick a ray. Drag the ray in the droplet and the marker follows.',
    graphShow: 'Show graphs',
    graphHide: 'Hide graphs',
    graphCollapsedHint:
      'Exit angle and ray distribution — the numbers the rainbow angle comes out of.',
    graphExitExplain:
      "Every incoming ray is labelled by where it hits the droplet: b/R = 0 is dead centre, b/R = 1 grazes the edge. The curve gives the direction that ray leaves in. Near its turning point the curve is almost flat, so a whole band of impact parameters exits at nearly the same angle — that pile-up is the rainbow, and the angle it happens at is the bow's angular radius. Each wavelength has its own curve, each turning over at a slightly different angle; that is where the colours come from.",
    graphDistExplain:
      'Samples land at random across the whole face of the droplet, each on an equal patch of it, '
      + 'so each carries the same amount of incoming light. What gets added up is not their number '
      + 'but their energy: how much survives the refractions and the bounces, spread over the solid '
      + 'angle it leaves into. Most directions get a similar modest share. One does not — where the '
      + 'exit-angle curve goes flat, a whole band of entry points piles into the same direction and '
      + 'the energy spikes. That spike is the bow, at the angle you have to look at. Raise the '
      + 'sample count and it sharpens out of the noise on its own.',
    extremumLabel: 'extremum → rainbow',
    rayCount: 'Number of rays',
    accumulate: 'Accumulate rays',

    /* ---- controls: sun ---- */
    sun: 'Sun',
    dropletSizeNote:
      'Droplet size barely touches the angle: geometric optics gives the same 42° for a 0.1 mm drop '
      + 'and a 5 mm one. Size decides how sharp and how saturated a real bow looks, and that is wave '
      + 'optics, which this simulation does not compute. So there is no size control here.',
    sunElevationDropletHint:
      'The same control the rain and sky scenes use. The higher the Sun, the further the antisolar '
      + 'direction tips below the horizontal — and this cross-section tilts with it, so the two '
      + 'pictures line up.',
    sunElevation: 'Height of the Sun above the horizon',
    sunAzimuth: 'Sun azimuth',
    observer: 'Observer',
    observerHeight: 'Observer height',
    viewMode: 'View',
    viewOrbit: 'From outside',
    viewEye: "Observer's eye",
    lookAzimuth: 'View direction',
    lookElevation: 'View tilt',
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
    dropletZoom: 'Zoom out',
    dropletZoomHint: 'Zoom out to watch the ray colours spread apart on their way to the eye.',
    impactParameter: 'Impact parameter b/R',
    impactParameterHint:
      'Sunlight arrives parallel, so the only thing that differs between rays is where they land. The droplet is curved, so that also fixes the angle they meet the surface at: sin θᵢ = b/R. One slider, two numbers.',
    bowRayChips: 'Jump to a bow ray',
    moreDetail: 'More detail',
    reflections: 'Internal reflections',
    reflectionsHint:
      'Picking a number shows every order up to it, so the bows can be compared. The checkboxes below switch individual ones off again.',
    refractiveIndex: 'Refractive index',
    indexModel: 'Refractive-index model',
    indexTable: 'table (6 colours)',
    indexCauchy: 'Cauchy relation',
    indexScale: 'Refractive-index multiplier',
    optics: 'Optics',

    /* ---- controls: rays ---- */
    rays: 'Rays',
    showNonRainbow: 'Show non-rainbow rays',
    alexanderBandLabel: "Alexander's dark band",
    rayFan: 'Fan of rays',
    fanCount: 'Rays in the fan',

    /* ---- controls: visualisation ---- */
    visualization: 'Visualisation',
    showWalls: 'Mark what happens at each wall',
    wallThrough: 'through',
    wallPartial: 'reflects',
    wallTotal: 'total reflection',
    wallRemains: 'of the beam left',
    wallBudget: 'reaches the eye, of the original beam:',
    wallNeverTotal: 'θ_r < θ_c, so total reflection never happens',
    explNoTotalReflection:
      'Nearly every explanation says the bounces inside a raindrop are total internal reflection. '
      + 'They are not, and cannot be. Light refracts on the way in from θᵢ to θᵣ with '
      + 'sin θᵣ = sin θᵢ / n, so θᵣ can never exceed asin(1/n) — which is exactly the critical '
      + 'angle, {crit}. It meets the back wall at that same θᵣ, so it arrives under the critical '
      + 'angle. At the primary bow that is {theta}, and the wall reflects {refl} of the light. '
      + 'The rest leaves. Hence the dashed stubs: more light escapes at every wall than carries on.',
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
    showArrival: 'Arc of exit directions',
    showAlexander: "Alexander's dark band",
    showPrimary: 'Primary rainbow',
    showSecondary: 'Secondary rainbow',
    showHigherOrder: 'Higher orders',
    showSky: 'Sky',
    showAirObserver: 'Show what the aircraft sees',
    airHeight: 'Aircraft height',
    airHeightHint:
      'A second observer, flying above the shower. The dashed line continues the same bow into '
      + 'the part they can reach and you cannot — they have rain below them, you have ground.',
    airObserverSees: 'from an aircraft at',
    rainBelow: 'Rain below eye level too',

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
    rayTally: 'Rays reaching the eye',
    rayLegendReaches: 'forms the rainbow',
    rayLegendMisses: 'misses the observer',

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
    infoSwing: 'φ moves, per 0.01 of b',
    infoSwingStopped: 'stopped — this is the bow',
    arrivalArcLabel: 'where the rays go',
    arrivalArcHint:
      'One tick per ray in the fan, placed on the direction it left in. Where the ticks pile up the direction has stopped changing, and that is the bow. Everywhere else they spread out, because every ray heads somewhere different.',

    /* ---- classifications ---- */
    classMiss: 'MISSES THE DROPLET',
    classTangent: 'TANGENT RAY',
    classNoReflection: 'NO INTERNAL REFLECTION',
    classPrimary: 'PRIMARY RAINBOW FAMILY',
    classSecondary: 'SECONDARY RAINBOW FAMILY',
    classHigherOrder: 'HIGHER-ORDER RAINBOW',
    classNonCaustic: 'ORDINARY SCATTERED RAY',

    /* ---- labelled explanations required by the brief ---- */
    explPrimary:
      'One internal reflection inside the droplet, and only one. That is the primary bow, the brightest of them, because nothing further has been thrown away yet.',
    explSecondary:
      'The secondary bow comes from two internal reflections. Its exit-angle curve falls to a trough where the primary rises to a peak — which is where both the larger radius and the reversed colours come from. The extra bounce is a separate cost: it throws away most of the light.',
    explNoReflection: 'No internal reflection — does not contribute to the primary rainbow.',
    explNonCaustic:
      'The bounces are there, the exit angle is not. This ray leaves nowhere near the extremum, so it scatters like any other and adds to no bow at all.',
    explHigherOrder:
      'Three bounces or more. What is left is a fraction of the primary, and it comes back on the wrong side of the sky — beside the Sun rather than opposite it.',
    distSamples: 'samples',
    explEnergyPlot:
      'This plot is not a tally of rays, it is energy. Each sample lands on an equal patch of the '
      + 'droplet face, so it carries equal light; it is weighted by the Fresnel budget '
      + '(1−R)²·R^k, which is what survives the bounces; and it is divided by the solid angle of '
      + 'the ring it leaves into. The height of the curve is therefore brightness in that '
      + 'direction. Hence the sharp peak at 42° and zero immediately outside it — one bounce '
      + 'never sends anything past the primary.',
    explCaustic:
      'Where the curve flattens, a whole band of entry points leaves in almost one direction, so '
      + 'the light from all of them lands in the same narrow slice of sky. Optics calls that '
      + 'pile-up a caustic. The bright lines on the bottom of a swimming pool are the same thing.',
    explObserverHeight:
      "The angular radius of the rainbow does not depend on the observer's height. Height only changes how much of the circle the horizon can hide.",
    explNotOneReflection:
      'One internal reflection alone does not make a rainbow. The bright bow appears only when one internal reflection is combined with the angular concentration of rays near the extremum.',
    explAlexander:
      'Between the two bows lies a band no once- or twice-reflected ray can reach. The primary curve turns back at {inner} and the secondary at {outer}, both away from the gap, so geometric optics sends nothing into it. Not truly black, though: higher orders, reflection off droplet surfaces and ordinary atmospheric scattering all put some light there.',
    explNotAnObject:
      'A rainbow is not an object at some distance. Every observer receives light from a different set of droplets — the ones that happen to lie in the right angular direction.',

    /* ---- which reflection count makes which bow ---- */
    bowName0: 'no bow',
    bowName1: 'primary bow',
    bowName2: 'secondary bow',
    bowName3: 'tertiary bow',
    bowNameK: 'order-{k} bow',
    bowFromAntisolar: 'from the antisolar point',
    bowFromSun: 'from the Sun',
    dropletBowLine: 'k = {k} → {bow} · {angle} {side}',
    dropletBowNone: 'k = 0 → no internal reflection, no bow',
    bowLedgerTitle: 'Which bounce makes which bow',
    bowLedgerLight: 'light left',
    bowLedgerVs: 'vs primary',
    bowLedgerNote:
      "The percentage is pure Fresnel: (1−R)²·Rᵏ at that bow's own angle of incidence. Spreading over a wider band and a bigger ring takes more on top.",
    explWhyFainter:
      "Every extra bounce costs light, and the price is steep — seen from the inside, a water surface is a poor mirror. At the primary bow's angle it turns back only {r1} of what reaches it and lets the rest straight out. The whole primary rainbow stands on that sliver. Ask for a second bounce and you keep a fraction of a fraction: {rel2} of the primary's light. Then geometry takes its own cut, because the secondary sits on a bigger ring and smears the same colours across nearly twice the angle.",
    explReflectionIsWeak:
      "Nothing in the droplet bounces because it has to. Water's critical angle is {crit}, and the rainbow ray meets the back wall from inside at {theta} — well under it, so the surface is free to let light through, and it does. Most of it leaves on the spot. What stays behind is the rainbow.",

    /* ---- 3-D field: why this droplet and not the one beside it ---- */
    fieldPickInfo: 'Selected droplet',
    fieldBandsTitle: 'Where each order comes out',
    bowLedgerBow: 'bow',
    fieldTestNote:
      'The whole test is one question: at what angle from the antisolar point do you see this droplet? If some wavelength comes out at exactly that angle (±{tol}), the droplet is coloured. Nobody asks about distance — it is in the table out of curiosity, nothing more.',
    fieldDelivers: 'Sends you {nm} nm ({color}) — the {bow}.',
    fieldDeliversNone: 'Sends you nothing. The nearest bow band misses by {delta}.',
    fieldHiddenOrder:
      'The angle would work, but you have the {bow} switched off. Turn it on and this droplet lights up.',
    fieldWhyNote:
      'The droplet just beside this one is seen at a slightly different angle, so a different wavelength comes out of it — or none does. That is where the coloured ring comes from. Nothing draws it; it is simply every direction that makes the same angle with the axis.',
    fieldLitOfShown: '{lit} of {shown} droplets are lit',
    fieldTestLine: 'The test: angle from the antisolar point, ±{tol}. Distance does not enter it.',

    /* ---- the cross-section cuts a cone, so every family has two rays ---- */
    coneSliceNote:
      'One ray does all of this. The light that refracts out at the first wall is the primary. What stays inside and carries on to the next wall is the secondary, what stays again is the third order. Same ray, same entry point — the orders peel off it one wall at a time, each taking a fraction of what the one before it left behind. That is the cause of the secondary bow, and seeing it costs no second ray.',
    coneOtherSide: 'far side of the cone',
    entryHalvesNote:
      'The two eyes sit on the same side because each order comes in through its own half of the drop '
      + '— which is the only way to send both lots of light to one observer, since the exit side '
      + "flips with every bounce. Read each eye's own φ against the dashed antisolar line: {phi1} "
      + 'and {phi2}, which is {gap} apart. That difference is what the sky shows.',

    explBowNeedsOwnRay:
      "One ray shows how the secondary happens. It does not show the secondary bow. A bow is a pile-up, and each order piles up at its own impact parameter — {b1} for the primary, {b2} for the secondary. Drag the slider between them and watch which eye lights up. Only ever one at a time.",
    explOppositeHalves:
      'For both bows to reach one eye, each has to enter through a different half of the drop. '
      + 'The primary comes in through the top at b = +{b1}, bounces once and heads down. The '
      + 'secondary comes in through the bottom at b = −{b2}, bounces twice and heads down too. '
      + 'Same half for both and one of them leaves upward, away from the observer. So these are '
      + 'not two rays out of nowhere — they are two paths through two different entry points.',
    explSameSplitInSky:
      "The same split, out here. Every droplet does what the single one did: every order at once, each leaving in its own direction. Which one reaches you depends only on where the droplet sits — so the droplet giving you the primary cannot also give you the secondary. That one comes from entirely different droplets.",

    /* ---- the secondary, built rather than announced ---- */
    s13atitle: 'The same ray, one bounce further',
    s13abody:
      'Nothing new enters the droplet. That dashed stub at the first wall is the primary leaving; '
      + 'what stayed inside and reached the next wall makes the secondary. Both branches are on '
      + 'screen at once. Now find the ray the secondary belongs to — the chips jump between the '
      + 'two entry positions, and those sit in opposite halves of the drop. Watch which eye lights '
      + 'up. Only ever one.',
    s13btitle: 'Why the colours flip',
    s13bbody:
      'Every colour has its own angle, because it has its own refractive index. With one bounce '
      + 'red turns at 42.2° and violet at 40.5° — red is further from the antisolar point, so red '
      + 'is on the outside. With two bounces red is at 50.7° and violet at 53.7°, and now it is '
      + 'the other way round: violet is further out, red is nearer in. The plot shows why. The '
      + 'primary curve has a peak and red peaks higher; the secondary curve has a trough and red '
      + 'bottoms out lower. Same dispersion, reversed order.',
    explColourFlip:
      'Red turns over at {p1} in the primary and {p2} in the secondary; violet at {v1} and {v2}. One curve peaks and the other troughs, so the same spread of refractive index stacks the colours one way and then the other. The gap between them — {gap} of sky — is empty for the same reason: both curves turn away from it, so no once- or twice-reflected ray can land there.',
    turnMax: 'peak',
    turnMin: 'trough',
    turnRedOutside: 'red outside',
    turnRedInside: 'red inside',

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

    /* ---- tutorial ---- */
    tutorial: 'Tutorial',
    step: 'Step',
    of: 'of',
    next: 'Next',
    prev: 'Back',
    finish: 'Finish',
    startFree: 'Go to free mode',
    tutorialDone: 'Done. Now try the rest yourself.',

    s1title: 'Two bows, eight degrees',
    s1body:
      'This is where we are going. One spherical drop in cross-section, sunlight from the left, and '
      + 'two eyes: one 42.4° from the antisolar point, the other 50.4°. Between them sits a band '
      + 'that receives nothing. Each bow needs its own ray — entering at a different height, '
      + 'bouncing a different number of times inside. Try the two entry points. Everything after '
      + 'this takes the picture apart.',
    s1btitle: 'Can one raindrop create a rainbow?',
    s1bbody:
      'Back to the start, with an empty picture. One spherical drop in cross-section, one ray from '
      + 'the left, and not a single reflection yet. From here we build up to those two bows a step '
      + 'at a time, and nothing you see is drawn in advance.',
    s2title: 'Trace the ray',
    s2body:
      'Drag the impact-parameter slider, or drag inside the droplet itself. Where the ray lands '
      + 'decides everything: a sphere tilts away from you as you go out towards the rim, so '
      + 'moving the entry point changes the angle the ray strikes at. Snell’s law does the rest: '
      + 'sin θᵢ = n · sin θᵣ.',
    s3title: 'Add internal reflection',
    s3body:
      'At the back wall part of the light reflects back inside. How much? The wall markers say, '
      + 'for this ray: how much goes through, how much reflects on, and the dashed stub is the '
      + 'light that escaped there. Under each is a second number — how much of the original beam '
      + 'is still left. Drag the slider and both change with the angle of incidence. Follow the '
      + 'path R0 → R1 → R2 → R3 and watch the numbers with it.',
    s4title: 'Where does the outgoing ray point?',
    s4body:
      'The ray leaves in some direction. But the angle worth reading is not measured at the '
      + 'droplet — it is measured at you. Stand with the Sun behind you: φ is the angle between '
      + 'the droplet and the point directly opposite the Sun, which is the shadow of your own '
      + 'head. The panel on the right prints it.',
    s5title: 'Try different incoming rays',
    s5body:
      'Sweep the impact parameter and watch the graph below. The point is not that the angle is '
      + 'largest somewhere — it is that the curve goes flat there. Flat means a whole band of '
      + 'entry points leaves in nearly the same direction. Everywhere else the angle shifts with '
      + 'every step you take and the light spreads out. Whether that flat spot is a peak or a '
      + 'trough does not matter: one bounce gives a peak, two give a trough, and the bow is at '
      + 'the turn either way.',
    s7title: 'Why is there a bright direction?',
    s7body:
      'The same flat spot, now counted. The plot below adds up the light leaving in each '
      + 'direction — not how many rays, but how much energy. Away from the bow the light spreads '
      + 'thin. At the flat spot a whole band of entry points lands in one narrow range of angles '
      + 'and the curve spikes. Raise the sample count and the spike sharpens out of the noise.',
    s8title: 'Now add thousands of droplets',
    s8body:
      'Every droplet does the same thing. Light reaches the observer only from droplets that lie at the right angle. Raise the droplet count and watch the bow fill in.',
    s10title: 'The same droplets, now in space',
    s10body:
      'The same question with the cross-section removed: every droplet around you is asked what angle you see it at, and whether some wavelength comes out exactly there. No circle is drawn — only the droplets that passed are coloured, and an arc comes out of them anyway.',
    explFieldAssembles:
      'Add droplets and the arc thickens; take them away and it breaks back into separate points. A rainbow is not a drawn shape, it is a tally: how many droplets happen to stand in the right direction.',
    s11title: 'Why does it look like an arc?',
    s11body:
      'In three dimensions all those directions form a cone around the antisolar point. The cone meets the sky in a circle. Switch the horizon on and the lower part disappears.',
    s11btitle: 'Why an arc and not a circle',
    s11bbody:
      'From the ground you get about 40 % of a circle. The rest is below the horizon with the '
      + 'ground standing in it. Height on its own barely helps — ten kilometres up buys three '
      + 'degrees of horizon dip. What decides it is whether there is rain below you. Switch that '
      + 'on and climb. At around 1.7 km the ring closes.',
    explFullCircle:
      'A rainbow is always a full circle. From the ground you see the top of it, because the '
      + 'antisolar point is below the horizon — with the Sun 15° up the bow runs from +27.2° down '
      + 'to −57.2°, and everything under zero is ground. The bottom of the circle is made of '
      + 'droplets below your eye, sending their light upward to you. From a plane, a cliff or '
      + 'above the spray of a waterfall those droplets are there, and the ring closes.',
    explArrivalArc:
      'The arc above the droplet counts exit directions. It is not a drawn rainbow — it is a '
      + 'density: how often rays leave along each direction. Most directions get almost nothing; '
      + 'one gets a bulge. That bulge is the bow, and a single ray cannot show it.',
    s11ctitle: 'What the aircraft sees',
    s11cbody:
      'Same sky, two observers. You are standing in a field. The dashed line is the rest of the '
      + 'same bow — the part someone flying at three kilometres gets and you do not. Nothing about '
      + 'the light changed: the bow is the same 42° from the antisolar point for both of you. What '
      + 'changed is what is underneath. They have rain down there, you have ground. The secondary '
      + 'does the same thing eight degrees further out.',
    explAirObserver:
      'The droplets making the dashed part sit below eye level, so their light travels upward. On '
      + 'the ground nobody catches it — where those droplets would have to be, there is ground. From '
      + 'an aircraft there is rain, and the circle closes. HyperPhysics puts it plainly: the whole '
      + 'circle can be seen from a plane because droplets can be falling both above and below you.',
    s12title: 'Where do the colours come from?',
    s12body:
      "Water's refractive index depends on wavelength. Move dispersion from 0 % to 100 % and a single angle splits into a band of colours. The graph below splits with it, one curve per wavelength.",
    s13ctitle: 'The band nothing arrives in',
    s13cbody:
      'The ray is set to the secondary, which is why it enters through the BOTTOM half of the '
      + 'drop — only from there does two bounces send it down to the observer. Through the top '
      + 'half it would leave upward, away. The primary is the other way round. That is why both '
      + 'eyes sit on the same side, 8° apart, with a wedge between them that takes no light at '
      + "all — not after one bounce, not after two, at no entry point. That is Alexander's band.",
    s13title: 'Can there be another rainbow?',
    s13body:
      'And here is how it lands in the sky. The band sits exactly between the primary’s red '
      + 'rim at 42.4° and the secondary’s red rim at 50.4° — so yes, it is the gap between the '
      + 'two red circles. It is dark because nothing leaves a droplet into it: one bounce never '
      + 'gets past the primary, two bounces never get inside the secondary. Toggle the band '
      + 'shading off and on, and compare it with the sky outside the secondary — there is light '
      + 'there, just faint.',

/* ---- controls: the observer ---- */
    observerGroup: 'Observer',
    observerDepth: 'Observer — forward / back',
    observerRise: 'Observer — up / down',
    observerMoveHint:
      'Moving the observer changes the angle to every droplet, so a different set of droplets forms the bow. The observer can also be dragged in the picture.',
    observerRecentre: 'Back to the starting point',
    indexGroup: 'Refractive index (advanced)',
    observerOnBow: '✓ exactly on the bow',
    dropsMoveHint: 'Drag the observer — the bow moves with you, onto different droplets.',
    obsChipForward: 'further into the rain',
    obsChipUp: 'higher',
    obsChipDown: 'lower',

    /* ---- tutorial: the two observer steps ---- */
    s6title: 'Add more rays',
    s6body:
      'Four parallel rays, four different directions out. Nothing special. Put sixteen in, then sixty, and '
      + 'watch where they start to stack. Most directions stay nearly empty; one fills up. That is where '
      + 'the eye is. A rainbow is not the direction a ray goes — it is the direction a crowd of them goes at once.',
    explObserverAngle:
      'φ is measured at the observer: between the line of sight to the droplet and the antisolar direction, the direction the sunlight was already travelling. It is the same φ the exit readout prints.',
    s9title: 'A rainbow is not in a place',
    s9body:
      'Not one droplet moves. The only thing that changes is where you stand. Move the observer and a completely different set of droplets forms the bow, because the only thing that decides is the angle you see them at.',
    explBowFollowsYou:
      'This is why you can never walk up to a rainbow, and why no two people see theirs on the same droplets. Yours is yours alone.',
    explDispersionZoom:
      'Zooming out shrinks the droplet but not the angular spread between the colours — which is what turns one ray into a visibly coloured fan.',

/* ---- export & footer ---- */
    exportPng: 'Save PNG',
    exportPngHint: 'Saves this figure at triple resolution, with a caption.',
    exportWorking: 'saving…',
    exportSaved: 'saved',
    exportDeclined: 'cancelled',
    exportFailed: 'could not save',
    favFaculty: 'Faculty of Applied Sciences, University of West Bohemia',

    /* ---- quiz ---- */
    quiz: 'Questions',
    quizIntro: 'You can check every answer in the simulation itself.',
    showAnswer: 'Show answer',
    hideAnswer: 'Hide answer',
    q1: 'What happens if a ray passes through the droplet without an internal reflection?',
    a1: 'It carries on forwards, only slightly deflected. It heads away from an observer who has the Sun behind them, and contributes nothing to the primary bow.',
    q2: 'Does every one-reflection ray produce a rainbow?',
    a2: 'No. The bright rainbow results from angular concentration near the caustic.',
    q3: 'Why is the rainbow about 42° from the antisolar direction?',
    a3: 'Because the one-reflection ray family has an extremum in its deviation angle.',
    q4: 'Why is the rainbow circular?',
    a4: 'Because the relevant outgoing directions form a cone around the antisolar direction.',
    q5: 'Why do we usually see only an arc?',
    a5: 'Because the horizon and the ground hide the lower part of the circle.',
    q6: 'Why are there colours?',
    a6: 'Because water has different refractive indices for different wavelengths.',
    q7: 'Why is the secondary rainbow outside the primary?',
    a7: 'Two internal reflections produce a larger angular deviation.',

    /* ---- many-droplets scene ---- */
    dropCount: 'Number of droplets',
    dropsHint:
      'Green droplets send light to the observer, grey ones do not. Only the angle matters, not the distance.',
    dropsSunHint:
      "Change the Sun's height — different droplets light up. A rainbow is not an object at one place, only an angle. Another observer would have their own.",
    dropsLegendReaches: "reaches the observer's eye",
    dropsLegendMisses: 'lit too, but misses — wrong angle',
    dropsContributing: 'Droplets reaching the observer',

    /* ---- many droplets: inspecting one of them ---- */
    dropsClickHint: 'Click a droplet to see every ray it sends out, and at what angle.',
    dropsClearHint: 'Click away from any droplet to clear the selection.',
    dropIncoming: 'sunlight',
    dropHits: 'φ {angle} — reaches the eye',
    dropMisses: 'φ {angle} — misses the eye',
    dropInfo: 'Selected droplet',
    dropSeenAt: 'Angle from the antisolar direction φ',
    dropDistanceRow: 'Distance from the observer',
    dropDistanceNote:
      'Distance appears nowhere in the test. Only the direction counts — which is why a rainbow is not an object sitting in a place.',
    dropOrdersTitle: 'Where this droplet sends its concentrated light',
    dropDelivers: 'Sends you {color} — the {bow}.',
    dropDeliversNone: 'Delivers nothing to your eye — the nearest bow direction misses by {delta}.',
    dropPhiThetaNote:
      'Θ is the angle the droplet turns the light through; φ = 180° − Θ is the angle the droplet has to be seen at. So the figure draws Θ at the droplet and φ at the eye.',
    dropHigherNote:
      'The third reflection only comes out at φ ≈ {phi}, about {fromSun} from the Sun — forward into the rain, not back towards the observer. That is why you never find a tertiary bow in the sky opposite the Sun.',
    dropInfoHint: 'Click another droplet in the figure to select that one instead.',
    dropClear: 'Clear selection',
    animateDrops: 'Add droplets gradually',

    /* ---- sky scene ---- */
    skyHint: 'Drag to rotate, scroll to zoom.',

    /* ---- 3-D sky: tracing one beam ---- */
    skyClickHint: 'Click the bow to trace one beam back to where it comes from.',
    skyClearHint: 'Click empty sky to clear the selection.',
    skyPickInfo: 'Traced beam',
    skyPickOrder: 'Internal reflections k',
    skyPickElevation: 'Elevation above the horizon',
    skyPickRoll: 'Position around the circle',
    skyPickNote:
      'The droplet in this direction receives sunlight like every other one. Order k = {k} leaves it at exactly the angle you are looking from, so that light reaches your eye. The other orders leave the same droplet in other directions — which is why you only ever see one order in a given direction, and why the secondary bow is made of entirely different droplets.',
    skyPickOthers: 'Where the other orders leave the same droplet',
    skyPickMiss: 'misses your eye by {delta}',
    skyPickReaches: 'reaches your eye',
    skyPickClear: 'Clear selection',
    skyPickBelowHorizon:
      'This direction is below the horizon, so there is no rain to see there and the beam is not drawn. Lower the Sun, or turn on rain below eye level.',
    coneAngle: 'Cone angle',
    bowVisible: 'Visible part of the bow',
    rainSeenBelow: 'Rain below the horizon',
    horizonDip: 'Horizon dip',
    horizonOfObserver: "observer's horizon",
    groundLevel: 'ground level',
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
      'Rendering of the bow is switched off. Turn it on once you can predict where it will be.',
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
