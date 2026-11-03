/* =========================================================
   ひらがな Cartas — dados dos caracteres
   k: kana · r: romaji · s: som (quando difere do romaji)
   row: família · g: grupo · st: nº de traços · alt: variação
   tip: dica de pronúncia · w: [palavra, romaji, tradução]
   ========================================================= */

const ROWS = [
  { id: 'a', label: 'あ', name: 'Vogais', group: 'basic' },
  { id: 'k', label: 'か', name: 'K', group: 'basic' },
  { id: 's', label: 'さ', name: 'S', group: 'basic' },
  { id: 't', label: 'た', name: 'T', group: 'basic' },
  { id: 'n', label: 'な', name: 'N', group: 'basic' },
  { id: 'h', label: 'は', name: 'H', group: 'basic' },
  { id: 'm', label: 'ま', name: 'M', group: 'basic' },
  { id: 'y', label: 'や', name: 'Y', group: 'basic' },
  { id: 'r', label: 'ら', name: 'R', group: 'basic' },
  { id: 'w', label: 'わ', name: 'W · N', group: 'basic' },
  { id: 'g', label: 'が', name: 'G', group: 'dakuten' },
  { id: 'z', label: 'ざ', name: 'Z', group: 'dakuten' },
  { id: 'd', label: 'だ', name: 'D', group: 'dakuten' },
  { id: 'b', label: 'ば', name: 'B', group: 'dakuten' },
  { id: 'p', label: 'ぱ', name: 'P', group: 'dakuten' },
];

const R_TIP = 'O "r" japonês é um toque leve da língua, como o "r" de "caro" — nunca o "r" forte de "rato".';

const HIRAGANA = [
  // Vogais
  { k: 'あ', r: 'a', row: 'a', st: 3, tip: 'Como o "a" de "casa".', w: ['あめ', 'ame', 'chuva'] },
  { k: 'い', r: 'i', row: 'a', st: 2, tip: 'Como o "i" de "vida".', w: ['いぬ', 'inu', 'cachorro'] },
  { k: 'う', r: 'u', row: 'a', st: 2, tip: '"u" curto, com os lábios quase sem arredondar.', w: ['うみ', 'umi', 'mar'] },
  { k: 'え', r: 'e', row: 'a', st: 2, tip: 'Entre o "é" e o "ê", como em "ela".', w: ['えき', 'eki', 'estação'] },
  { k: 'お', r: 'o', row: 'a', st: 3, tip: 'Como o "ô" de "ovo".', w: ['おちゃ', 'ocha', 'chá'] },
  // K
  { k: 'か', r: 'ka', row: 'k', st: 3, tip: 'Como "ca" de "casa".', w: ['かさ', 'kasa', 'guarda-chuva'] },
  { k: 'き', r: 'ki', row: 'k', st: 4, alt: 3, tip: 'Como "qui" de "quilo".', w: ['き', 'ki', 'árvore'] },
  { k: 'く', r: 'ku', row: 'k', st: 1, tip: 'Como "cu" de "cuidado", com o "u" bem leve.', w: ['くつ', 'kutsu', 'sapato'] },
  { k: 'け', r: 'ke', row: 'k', st: 3, tip: 'Como "quê".', w: ['けむり', 'kemuri', 'fumaça'] },
  { k: 'こ', r: 'ko', row: 'k', st: 2, tip: 'Como "cô" de "coco".', w: ['こども', 'kodomo', 'criança'] },
  // S
  { k: 'さ', r: 'sa', row: 's', st: 3, alt: 2, tip: 'Como "sa" de "sapo".', w: ['さかな', 'sakana', 'peixe'] },
  { k: 'し', r: 'shi', row: 's', st: 1, tip: 'Soa como "xi" (de "xícara") — não "si"!', w: ['しろ', 'shiro', 'branco'] },
  { k: 'す', r: 'su', row: 's', st: 2, tip: 'Como "su" de "suco", com o "u" quase mudo.', w: ['すし', 'sushi', 'sushi'] },
  { k: 'せ', r: 'se', row: 's', st: 3, tip: 'Como "sê".', w: ['せかい', 'sekai', 'mundo'] },
  { k: 'そ', r: 'so', row: 's', st: 1, alt: 2, tip: 'Como "sô".', w: ['そら', 'sora', 'céu'] },
  // T
  { k: 'た', r: 'ta', row: 't', st: 4, tip: 'Como "tá".', w: ['たまご', 'tamago', 'ovo'] },
  { k: 'ち', r: 'chi', row: 't', st: 2, tip: 'Soa como "tchi" (de "tchau").', w: ['ちず', 'chizu', 'mapa'] },
  { k: 'つ', r: 'tsu', row: 't', st: 1, tip: 'Som "ts" + u, como em "tsunami".', w: ['つき', 'tsuki', 'lua'] },
  { k: 'て', r: 'te', row: 't', st: 1, tip: 'Como "tê" — nunca "tchê".', w: ['て', 'te', 'mão'] },
  { k: 'と', r: 'to', row: 't', st: 2, tip: 'Como "tô".', w: ['とり', 'tori', 'pássaro'] },
  // N
  { k: 'な', r: 'na', row: 'n', st: 4, tip: 'Como "ná".', w: ['なつ', 'natsu', 'verão'] },
  { k: 'に', r: 'ni', row: 'n', st: 3, tip: 'Como "ni" de "ninho".', w: ['にく', 'niku', 'carne'] },
  { k: 'ぬ', r: 'nu', row: 'n', st: 2, tip: 'Como "nu".', w: ['ぬの', 'nuno', 'tecido'] },
  { k: 'ね', r: 'ne', row: 'n', st: 2, tip: 'Como "nê".', w: ['ねこ', 'neko', 'gato'] },
  { k: 'の', r: 'no', row: 'n', st: 1, tip: 'Como "nô". Também é a partícula de posse.', w: ['のり', 'nori', 'alga'] },
  // H
  { k: 'は', r: 'ha', row: 'h', st: 3, tip: 'O "h" é aspirado, como no inglês "house". Como partícula, lê-se "wa".', w: ['はな', 'hana', 'flor'] },
  { k: 'ひ', r: 'hi', row: 'h', st: 1, tip: '"h" aspirado, quase um "x" bem suave: "hi".', w: ['ひ', 'hi', 'fogo'] },
  { k: 'ふ', r: 'fu', row: 'h', st: 4, tip: 'Entre "fu" e "hu": sopre de leve sem encostar os dentes no lábio.', w: ['ふね', 'fune', 'barco'] },
  { k: 'へ', r: 'he', row: 'h', st: 1, tip: '"h" aspirado: "he". Como partícula de direção, lê-se "e".', w: ['へや', 'heya', 'quarto'] },
  { k: 'ほ', r: 'ho', row: 'h', st: 4, tip: '"h" aspirado: "ho".', w: ['ほし', 'hoshi', 'estrela'] },
  // M
  { k: 'ま', r: 'ma', row: 'm', st: 3, tip: 'Como "má".', w: ['まど', 'mado', 'janela'] },
  { k: 'み', r: 'mi', row: 'm', st: 2, tip: 'Como "mi".', w: ['みず', 'mizu', 'água'] },
  { k: 'む', r: 'mu', row: 'm', st: 3, tip: 'Como "mu", com o "u" leve.', w: ['むし', 'mushi', 'inseto'] },
  { k: 'め', r: 'me', row: 'm', st: 2, tip: 'Como "mê".', w: ['め', 'me', 'olho'] },
  { k: 'も', r: 'mo', row: 'm', st: 3, tip: 'Como "mô".', w: ['もり', 'mori', 'floresta'] },
  // Y
  { k: 'や', r: 'ya', row: 'y', st: 3, tip: 'Como "iá".', w: ['やま', 'yama', 'montanha'] },
  { k: 'ゆ', r: 'yu', row: 'y', st: 2, tip: 'Como "iú".', w: ['ゆき', 'yuki', 'neve'] },
  { k: 'よ', r: 'yo', row: 'y', st: 2, tip: 'Como "iô".', w: ['よる', 'yoru', 'noite'] },
  // R
  { k: 'ら', r: 'ra', row: 'r', st: 2, tip: R_TIP, w: ['らいおん', 'raion', 'leão'] },
  { k: 'り', r: 'ri', row: 'r', st: 2, alt: 1, tip: R_TIP, w: ['りんご', 'ringo', 'maçã'] },
  { k: 'る', r: 'ru', row: 'r', st: 1, tip: R_TIP, w: ['くるま', 'kuruma', 'carro'] },
  { k: 'れ', r: 're', row: 'r', st: 2, tip: R_TIP, w: ['れきし', 'rekishi', 'história'] },
  { k: 'ろ', r: 'ro', row: 'r', st: 1, tip: R_TIP, w: ['ろうそく', 'rousoku', 'vela'] },
  // W · N
  { k: 'わ', r: 'wa', row: 'w', st: 2, tip: 'Como "uá".', w: ['わたし', 'watashi', 'eu'] },
  { k: 'を', r: 'wo', s: 'o', row: 'w', st: 3, tip: 'Lido como "o". Usado quase só como partícula de objeto.', w: ['ほんをよむ', 'hon o yomu', 'ler um livro'] },
  { k: 'ん', r: 'n', row: 'w', st: 1, tip: 'Som nasal, como o final de "bem". É o único que soa sozinho, sem vogal.', w: ['ほん', 'hon', 'livro'] },
  // G
  { k: 'が', r: 'ga', row: 'g', st: 5, tip: 'Como "gá" — o "g" é sempre duro.', w: ['がっこう', 'gakkou', 'escola'] },
  { k: 'ぎ', r: 'gi', row: 'g', st: 6, tip: 'Como "gui" de "guitarra" — nunca "ji".', w: ['ぎんこう', 'ginkou', 'banco'] },
  { k: 'ぐ', r: 'gu', row: 'g', st: 3, tip: 'Como "gu".', w: ['かぐ', 'kagu', 'móveis'] },
  { k: 'げ', r: 'ge', row: 'g', st: 5, tip: 'Como "guê" — nunca "jê".', w: ['げんき', 'genki', 'saudável, animado'] },
  { k: 'ご', r: 'go', row: 'g', st: 4, tip: 'Como "gô".', w: ['ごはん', 'gohan', 'arroz, refeição'] },
  // Z
  { k: 'ざ', r: 'za', row: 'z', st: 5, tip: 'Como "zá".', w: ['ざっし', 'zasshi', 'revista'] },
  { k: 'じ', r: 'ji', row: 'z', st: 3, tip: 'Como "dji" ou "ji" (de "jipe").', w: ['じかん', 'jikan', 'tempo, hora'] },
  { k: 'ず', r: 'zu', row: 'z', st: 4, tip: 'Como "dzu" ou "zu".', w: ['すずめ', 'suzume', 'pardal'] },
  { k: 'ぜ', r: 'ze', row: 'z', st: 5, tip: 'Como "zê".', w: ['かぜ', 'kaze', 'vento'] },
  { k: 'ぞ', r: 'zo', row: 'z', st: 3, tip: 'Como "zô".', w: ['ぞう', 'zou', 'elefante'] },
  // D
  { k: 'だ', r: 'da', row: 'd', st: 6, tip: 'Como "dá".', w: ['だいがく', 'daigaku', 'universidade'] },
  { k: 'ぢ', r: 'ji', row: 'd', st: 4, tip: 'Mesmo som de じ (ji). É raro.', w: ['はなぢ', 'hanaji', 'sangramento nasal'] },
  { k: 'づ', r: 'zu', row: 'd', st: 3, tip: 'Mesmo som de ず (zu). É raro.', w: ['つづく', 'tsuzuku', 'continuar'] },
  { k: 'で', r: 'de', row: 'd', st: 3, tip: 'Como "dê" — nunca "djê".', w: ['でんわ', 'denwa', 'telefone'] },
  { k: 'ど', r: 'do', row: 'd', st: 4, tip: 'Como "dô".', w: ['どこ', 'doko', 'onde'] },
  // B
  { k: 'ば', r: 'ba', row: 'b', st: 5, tip: 'Como "bá".', w: ['ばら', 'bara', 'rosa'] },
  { k: 'び', r: 'bi', row: 'b', st: 3, tip: 'Como "bi".', w: ['えび', 'ebi', 'camarão'] },
  { k: 'ぶ', r: 'bu', row: 'b', st: 6, tip: 'Como "bu".', w: ['ぶた', 'buta', 'porco'] },
  { k: 'べ', r: 'be', row: 'b', st: 3, tip: 'Como "bê".', w: ['べんとう', 'bentou', 'marmita'] },
  { k: 'ぼ', r: 'bo', row: 'b', st: 6, tip: 'Como "bô".', w: ['ぼうし', 'boushi', 'chapéu'] },
  // P
  { k: 'ぱ', r: 'pa', row: 'p', st: 4, tip: 'Como "pá".', w: ['ぱん', 'pan', 'pão'] },
  { k: 'ぴ', r: 'pi', row: 'p', st: 2, tip: 'Como "pi".', w: ['ぴかぴか', 'pikapika', 'brilhante'] },
  { k: 'ぷ', r: 'pu', row: 'p', st: 5, tip: 'Como "pu".', w: ['てんぷら', 'tenpura', 'tempurá'] },
  { k: 'ぺ', r: 'pe', row: 'p', st: 2, tip: 'Como "pê".', w: ['ぺらぺら', 'perapera', 'fluente'] },
  { k: 'ぽ', r: 'po', row: 'p', st: 5, tip: 'Como "pô".', w: ['たんぽぽ', 'tanpopo', 'dente-de-leão'] },
];

// grupo de cada caractere
HIRAGANA.forEach(h => { h.g = ROWS.find(r => r.id === h.row).group; });

// Caracteres que costumam ser confundidos (usados como alternativas "difíceis" no quiz)
const CONFUSABLES = {
  'あ': ['お', 'め', 'ぬ'], 'お': ['あ', 'む', 'す'], 'い': ['り', 'こ', 'け'], 'り': ['い', 'け', 'わ'],
  'う': ['つ', 'ら', 'ろ'], 'つ': ['う', 'し', 'へ'], 'さ': ['ち', 'き', 'せ'], 'ち': ['さ', 'ら', 'る'],
  'き': ['さ', 'ま', 'も'], 'ぬ': ['め', 'ね', 'の'], 'め': ['ぬ', 'あ', 'の'], 'ね': ['れ', 'わ', 'ぬ'],
  'れ': ['ね', 'わ', 'る'], 'わ': ['れ', 'ね', 'ゆ'], 'は': ['ほ', 'け', 'よ'], 'ほ': ['は', 'ま', 'け'],
  'ま': ['ほ', 'も', 'よ'], 'る': ['ろ', 'ら', 'ち'], 'ろ': ['る', 'ら', 'う'], 'こ': ['に', 'い', 'て'],
  'に': ['こ', 'た', 'け'], 'た': ['な', 'に', 'は'], 'な': ['た', 'は', 'ふ'], 'け': ['は', 'い', 'に'],
  'し': ['つ', 'も', 'ん'], 'も': ['し', 'ま', 'き'], 'ん': ['そ', 'し', 'え'], 'そ': ['ん', 'て', 'ろ'],
  'て': ['そ', 'こ', 'と'], 'く': ['へ', 'し', 'て'], 'へ': ['く', 'つ', 'し'], 'ゆ': ['わ', 'る', 'ね'],
  'よ': ['ま', 'は', 'ほ'], 'え': ['ん', 'そ', 'る'], 'ら': ['う', 'ち', 'ろ'], 'を': ['と', 'も', 'お'],
  'と': ['を', 'こ', 'て'], 'す': ['む', 'お', 'あ'], 'む': ['す', 'お', 'め'], 'み': ['め', 'ゆ', 'の'],
  'ふ': ['な', 'か', 'む'], 'ひ': ['い', 'へ', 'く'], 'の': ['め', 'ぬ', 'あ'], 'せ': ['さ', 'や', 'ち'],
  'や': ['か', 'せ', 'わ'], 'か': ['や', 'た', 'き'],
};

const TABLE_BASIC = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['や', '', 'ゆ', '', 'よ'],
  ['ら', 'り', 'る', 'れ', 'ろ'],
  ['わ', '', '', '', 'を'],
  ['ん', '', '', '', ''],
];

const TABLE_DAKU = [
  ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
  ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
  ['だ', 'ぢ', 'づ', 'で', 'ど'],
  ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
  ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'],
];

/* =========================================================
   Vocabulário — Fase 2 (montar palavras) e Fase 3 (significados)
   k: palavra · r: romaji · pt: significado · e: emoji · cat: categoria
   Só usa caracteres da tabela acima (sem ゃ/っ pequenos nem vogais longas),
   para que toda palavra possa ser montada com as cartas.
   ========================================================= */
const WORD_CATS = {
  animais: '🐾 Animais',
  natureza: '🌿 Natureza',
  comida: '🍙 Comida',
  corpo: '🧍 Corpo',
  coisas: '🎒 Objetos',
  cores: '🎨 Cores',
  lugares: '🏠 Pessoas e lugares',
};

const WORDS = [
  // Animais
  { k: 'ねこ', r: 'neko', pt: 'gato', e: '🐱', cat: 'animais' },
  { k: 'いぬ', r: 'inu', pt: 'cachorro', e: '🐶', cat: 'animais' },
  { k: 'さかな', r: 'sakana', pt: 'peixe', e: '🐟', cat: 'animais' },
  { k: 'とり', r: 'tori', pt: 'pássaro', e: '🐦', cat: 'animais' },
  { k: 'うま', r: 'uma', pt: 'cavalo', e: '🐴', cat: 'animais' },
  { k: 'くま', r: 'kuma', pt: 'urso', e: '🐻', cat: 'animais' },
  { k: 'うし', r: 'ushi', pt: 'vaca', e: '🐮', cat: 'animais' },
  { k: 'ぶた', r: 'buta', pt: 'porco', e: '🐷', cat: 'animais' },
  { k: 'むし', r: 'mushi', pt: 'inseto', e: '🐛', cat: 'animais' },
  // Natureza
  { k: 'みず', r: 'mizu', pt: 'água', e: '💧', cat: 'natureza' },
  { k: 'やま', r: 'yama', pt: 'montanha', e: '⛰️', cat: 'natureza' },
  { k: 'かわ', r: 'kawa', pt: 'rio', e: '🏞️', cat: 'natureza' },
  { k: 'うみ', r: 'umi', pt: 'mar', e: '🌊', cat: 'natureza' },
  { k: 'そら', r: 'sora', pt: 'céu', e: '☁️', cat: 'natureza' },
  { k: 'あめ', r: 'ame', pt: 'chuva', e: '🌧️', cat: 'natureza' },
  { k: 'ゆき', r: 'yuki', pt: 'neve', e: '❄️', cat: 'natureza' },
  { k: 'はな', r: 'hana', pt: 'flor', e: '🌺', cat: 'natureza' },
  { k: 'さくら', r: 'sakura', pt: 'cerejeira', e: '🌸', cat: 'natureza' },
  { k: 'ほし', r: 'hoshi', pt: 'estrela', e: '⭐', cat: 'natureza' },
  { k: 'つき', r: 'tsuki', pt: 'lua', e: '🌙', cat: 'natureza' },
  { k: 'もり', r: 'mori', pt: 'floresta', e: '🌲', cat: 'natureza' },
  { k: 'かぜ', r: 'kaze', pt: 'vento', e: '🍃', cat: 'natureza' },
  // Comida
  { k: 'すし', r: 'sushi', pt: 'sushi', e: '🍣', cat: 'comida' },
  { k: 'たまご', r: 'tamago', pt: 'ovo', e: '🥚', cat: 'comida' },
  { k: 'ごはん', r: 'gohan', pt: 'arroz, refeição', e: '🍚', cat: 'comida' },
  { k: 'にく', r: 'niku', pt: 'carne', e: '🍖', cat: 'comida' },
  { k: 'りんご', r: 'ringo', pt: 'maçã', e: '🍎', cat: 'comida' },
  { k: 'みかん', r: 'mikan', pt: 'tangerina', e: '🍊', cat: 'comida' },
  { k: 'いちご', r: 'ichigo', pt: 'morango', e: '🍓', cat: 'comida' },
  { k: 'ぱん', r: 'pan', pt: 'pão', e: '🍞', cat: 'comida' },
  { k: 'のり', r: 'nori', pt: 'alga', e: '🍙', cat: 'comida' },
  // Corpo
  { k: 'みみ', r: 'mimi', pt: 'orelha', e: '👂', cat: 'corpo' },
  { k: 'くち', r: 'kuchi', pt: 'boca', e: '👄', cat: 'corpo' },
  { k: 'かお', r: 'kao', pt: 'rosto', e: '🙂', cat: 'corpo' },
  { k: 'あし', r: 'ashi', pt: 'pé, perna', e: '🦶', cat: 'corpo' },
  // Objetos
  { k: 'くるま', r: 'kuruma', pt: 'carro', e: '🚗', cat: 'coisas' },
  { k: 'でんわ', r: 'denwa', pt: 'telefone', e: '☎️', cat: 'coisas' },
  { k: 'ほん', r: 'hon', pt: 'livro', e: '📖', cat: 'coisas' },
  { k: 'かさ', r: 'kasa', pt: 'guarda-chuva', e: '☂️', cat: 'coisas' },
  { k: 'かばん', r: 'kaban', pt: 'bolsa, mochila', e: '🎒', cat: 'coisas' },
  { k: 'くつ', r: 'kutsu', pt: 'sapato', e: '👟', cat: 'coisas' },
  { k: 'てがみ', r: 'tegami', pt: 'carta', e: '✉️', cat: 'coisas' },
  { k: 'ふね', r: 'fune', pt: 'barco', e: '⛵', cat: 'coisas' },
  { k: 'おかね', r: 'okane', pt: 'dinheiro', e: '💰', cat: 'coisas' },
  // Cores
  { k: 'あか', r: 'aka', pt: 'vermelho', e: '🔴', cat: 'cores' },
  { k: 'あお', r: 'ao', pt: 'azul', e: '🔵', cat: 'cores' },
  { k: 'しろ', r: 'shiro', pt: 'branco', e: '⚪', cat: 'cores' },
  { k: 'くろ', r: 'kuro', pt: 'preto', e: '⚫', cat: 'cores' },
  { k: 'みどり', r: 'midori', pt: 'verde', e: '🟢', cat: 'cores' },
  // Pessoas e lugares
  { k: 'ひと', r: 'hito', pt: 'pessoa', e: '🧑', cat: 'lugares' },
  { k: 'ともだち', r: 'tomodachi', pt: 'amigo', e: '🤝', cat: 'lugares' },
  { k: 'こども', r: 'kodomo', pt: 'criança', e: '🧒', cat: 'lugares' },
  { k: 'いえ', r: 'ie', pt: 'casa', e: '🏠', cat: 'lugares' },
  { k: 'えき', r: 'eki', pt: 'estação', e: '🚉', cat: 'lugares' },
  { k: 'みせ', r: 'mise', pt: 'loja', e: '🏪', cat: 'lugares' },
  { k: 'へや', r: 'heya', pt: 'quarto', e: '🛏️', cat: 'lugares' },
];
