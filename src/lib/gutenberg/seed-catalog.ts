import type { Book } from '@/types/book';

// ── URL helpers ───────────────────────────────────────────────────────────────

function pgCover(id: number): string {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;
}

function pgEpub(id: number): string {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}-images.epub`;
}

function book(
  id: number,
  title: string,
  author: string,
  description: string,
  categories: string[],
  subjects: string[] = []
): Book {
  return {
    id: String(id),
    title,
    author,
    language: 'en',
    description,
    coverUrl: pgCover(id),
    subjects,
    categories,
    downloadUrl: pgEpub(id),
    dateAdded: Date.now(),
  };
}

// ── Curated catalog ───────────────────────────────────────────────────────────

export const seedCatalog: Book[] = [
  // ── Fiction ──────────────────────────────────────────────────────────────
  book(
    1342,
    'Pride and Prejudice',
    'Jane Austen',
    'The story of the Bennet family and the spirited Elizabeth Bennet as she navigates issues of marriage, morality, and misconceptions in Regency-era England.',
    ['Popular', 'Fiction', 'Romance'],
    ['Love stories', 'Domestic fiction', 'Young women -- Fiction']
  ),
  book(
    84,
    'Frankenstein; Or, The Modern Prometheus',
    'Mary Wollstonecraft Shelley',
    'Victor Frankenstein creates a sapient creature in an unorthodox experiment, sparking a gothic tale of ambition, responsibility, and the consequences of playing God.',
    ['Popular', 'Fiction', 'Horror', 'Science Fiction'],
    ['Science fiction', 'Horror tales', 'Monsters -- Fiction']
  ),
  book(
    345,
    'Dracula',
    'Bram Stoker',
    'Count Dracula attempts to move from Transylvania to England so that he may find new blood and spread the undead curse, while a small group of people try to stop him.',
    ['Popular', 'Fiction', 'Horror', 'Mystery & Detective'],
    ['Vampires -- Fiction', 'Horror tales']
  ),
  book(
    64317,
    'The Great Gatsby',
    'F. Scott Fitzgerald',
    'Set in the Jazz Age on Long Island, this novel depicts the mysterious millionaire Jay Gatsby and his obsession with the beautiful Daisy Buchanan.',
    ['Popular', 'Fiction'],
    ['Rich people -- Fiction', 'Long Island (N.Y.) -- Fiction']
  ),
  book(
    2701,
    'Moby Dick; Or, The Whale',
    'Herman Melville',
    'Sailor Ishmael narrates the obsessive quest of Captain Ahab, who seeks revenge on Moby Dick, the white sperm whale that bit off his leg on a previous voyage.',
    ['Popular', 'Fiction', 'Adventure'],
    ['Whaling -- Fiction', 'Sea stories']
  ),
  book(
    1260,
    'Jane Eyre: An Autobiography',
    'Charlotte Brontë',
    'The story of Jane Eyre, an orphan who overcomes hardship to become a governess and falls in love with the brooding Mr. Rochester, hiding a terrible secret.',
    ['Popular', 'Fiction', 'Romance'],
    ['Orphans -- Fiction', 'Governesses -- Fiction']
  ),
  book(
    768,
    'Wuthering Heights',
    'Emily Brontë',
    'A tale of passionate and doomed love set on the Yorkshire moors, following the turbulent relationship between Heathcliff and Catherine Earnshaw across generations.',
    ['Popular', 'Fiction', 'Romance'],
    ['Love stories', 'Revenge -- Fiction', 'Yorkshire (England) -- Fiction']
  ),
  book(
    174,
    'The Picture of Dorian Gray',
    'Oscar Wilde',
    'A hedonistic young man sells his soul for eternal youth and beauty while his portrait ages and reflects the corruption of his soul.',
    ['Popular', 'Fiction', 'Horror'],
    ['Supernatural -- Fiction', 'Didactic fiction']
  ),
  book(
    46,
    'A Tale of Two Cities',
    'Charles Dickens',
    'A historical novel set in London and Paris before and during the French Revolution, exploring themes of resurrection and sacrifice.',
    ['Popular', 'Fiction'],
    ['Historical fiction', 'France -- History -- Revolution, 1789-1799 -- Fiction']
  ),
  book(
    1400,
    'Great Expectations',
    'Charles Dickens',
    'The growth and personal development of an orphan named Pip, his great expectations, and the mysterious benefactor who funds his new life as a gentleman.',
    ['Popular', 'Fiction'],
    ['Bildungsromans', 'Orphans -- Fiction', 'England -- Social life and customs']
  ),
  book(
    2554,
    'Crime and Punishment',
    'Fyodor Dostoyevsky',
    'A psychological thriller in which poverty-stricken student Raskolnikov murders a pawnbroker and then struggles with the moral and psychological consequences.',
    ['Popular', 'Fiction', 'Mystery & Detective'],
    ['Psychological fiction', 'Murder -- Fiction', 'Saint Petersburg (Russia) -- Fiction']
  ),
  book(
    2600,
    'War and Peace',
    'Leo Tolstoy',
    'An epic novel that interweaves personal stories with the historical events of the Napoleonic Wars, exploring themes of history, freedom, and the search for meaning.',
    ['Popular', 'Fiction'],
    ['Historical fiction', 'Napoleonic Wars, 1800-1815 -- Fiction', 'Russia -- History -- Fiction']
  ),
  book(
    600,
    'Notes from the Underground',
    'Fyodor Dostoyevsky',
    'A monologue by a bitter, isolated retired civil servant exploring alienation, free will, and the contradictions of human nature.',
    ['Fiction', 'Philosophy'],
    ['Psychological fiction', 'Russia -- Social conditions -- Fiction']
  ),
  book(
    2097,
    'Middlemarch',
    'George Eliot',
    'A study of provincial life in 19th-century England, following multiple story threads centered on the idealistic Dorothea Brooke and the ambitious doctor Lydgate.',
    ['Fiction', 'Romance'],
    ['Domestic fiction', 'England -- Social life and customs -- 19th century -- Fiction']
  ),
  book(
    4300,
    'Ulysses',
    'James Joyce',
    'A landmark of modernist literature, following Leopold Bloom on a single day in Dublin (June 16, 1904), paralleling the structure of Homer\'s Odyssey.',
    ['Fiction'],
    ['Dublin (Ireland) -- Fiction', 'Modernist fiction']
  ),

  // ── Mystery & Detective ──────────────────────────────────────────────────
  book(
    1661,
    'The Adventures of Sherlock Holmes',
    'Arthur Conan Doyle',
    'Twelve short stories featuring the brilliant detective Sherlock Holmes and his faithful companion Dr. Watson solving mysterious crimes in Victorian London.',
    ['Popular', 'Mystery & Detective'],
    ['Detective and mystery stories', 'Holmes, Sherlock (Fictitious character)']
  ),
  book(
    2852,
    'The Hound of the Baskervilles',
    'Arthur Conan Doyle',
    'Sherlock Holmes investigates the legend of a supernatural hound threatening the Baskerville family on the Devonshire moors.',
    ['Popular', 'Mystery & Detective'],
    ['Detective and mystery stories', 'Holmes, Sherlock (Fictitious character)']
  ),
  book(
    108,
    'The Moonstone',
    'Wilkie Collins',
    'Often considered the first full-length detective novel in the English language, following the theft of a precious Indian diamond.',
    ['Mystery & Detective', 'Fiction'],
    ['Detective and mystery stories', 'Diamonds -- Fiction']
  ),
  book(
    863,
    'The Mystery of the Yellow Room',
    'Gaston Leroux',
    'Reporter Rouletabille investigates an apparently impossible crime: an assault in a sealed room with no visible means of entry or exit.',
    ['Mystery & Detective'],
    ['Detective and mystery stories', 'Locked-room mysteries']
  ),

  // ── Science Fiction ──────────────────────────────────────────────────────
  book(
    35,
    'The Time Machine',
    'H.G. Wells',
    'A scientist invents a time-travel machine and journeys to the year 802,701, discovering a distant future where humanity has evolved into two distinct species.',
    ['Popular', 'Science Fiction', 'Adventure'],
    ['Science fiction', 'Time travel -- Fiction']
  ),
  book(
    36,
    'The War of the Worlds',
    'H.G. Wells',
    'Martians invade England with devastating heat-rays, challenging the Victorian confidence in human supremacy and technological progress.',
    ['Popular', 'Science Fiction', 'Adventure'],
    ['Science fiction', 'Martians -- Fiction', 'War stories']
  ),
  book(
    5230,
    'Anthem',
    'Ayn Rand',
    'In a dark future collectivist society, one man dares to rediscover the word "I" and reclaim individual identity and freedom.',
    ['Science Fiction', 'Philosophy'],
    ['Dystopian fiction', 'Collectivism -- Fiction']
  ),
  book(
    1080,
    'A Modest Proposal',
    'Jonathan Swift',
    'A darkly satirical essay suggesting the poor Irish might ease their economic troubles by selling their children as food to the rich.',
    ['Fiction', 'Philosophy'],
    ['Satire', 'Ireland -- Economic conditions -- Fiction']
  ),
  book(
    521,
    'The Island of Doctor Moreau',
    'H.G. Wells',
    'A shipwrecked Englishman discovers a mad scientist\'s island where animals are vivisected into human forms, raising disturbing questions about evolution and ethics.',
    ['Science Fiction', 'Adventure', 'Horror'],
    ['Science fiction', 'Islands -- Fiction']
  ),

  // ── Romance ──────────────────────────────────────────────────────────────
  book(
    105,
    'Persuasion',
    'Jane Austen',
    'Anne Elliot is persuaded to break off her engagement to the young naval officer Frederick Wentworth. Years later, they meet again, and Anne must decide if a second chance is possible.',
    ['Romance', 'Fiction'],
    ['Love stories', 'England -- Social life and customs -- 19th century -- Fiction']
  ),
  book(
    161,
    'Sense and Sensibility',
    'Jane Austen',
    'The story of the Dashwood sisters — the sensible Elinor and the emotional Marianne — as they navigate love and heartbreak in Georgian England.',
    ['Romance', 'Fiction'],
    ['Love stories', 'Sisters -- Fiction', 'England -- Social life and customs -- Fiction']
  ),
  book(
    1322,
    'Emma',
    'Jane Austen',
    'A well-meaning but misguided young woman attempts to play matchmaker for her friends and neighbors in the English village of Highbury.',
    ['Romance', 'Fiction'],
    ['Love stories', 'Matchmaking -- Fiction', 'England -- Social life and customs']
  ),
  book(
    1498,
    'Anna Karenina',
    'Leo Tolstoy',
    'The tragic love affair of married noblewoman Anna Karenina and cavalry officer Count Vronsky against the backdrop of Russian high society.',
    ['Popular', 'Romance', 'Fiction'],
    ['Love stories', 'Russia -- Social life and customs -- Fiction']
  ),
  book(
    76,
    'Adventures of Huckleberry Finn',
    'Mark Twain',
    'Huck Finn escapes his drunken father and travels down the Mississippi River with Jim, a runaway slave, in a journey full of adventure and moral growth.',
    ['Popular', 'Fiction', 'Adventure'],
    ['Coming-of-age stories', 'Mississippi River -- Fiction', 'Adventure stories']
  ),

  // ── Philosophy ───────────────────────────────────────────────────────────
  book(
    1232,
    'The Prince',
    'Niccolò Machiavelli',
    'A 16th-century political treatise outlining how a prince can acquire and maintain power, infamous for its frank treatment of political expediency over ethics.',
    ['Philosophy'],
    ['Political science', 'Political ethics']
  ),
  book(
    1250,
    'Thus Spake Zarathustra',
    'Friedrich Nietzsche',
    'Nietzsche\'s philosophical novel follows the hermit Zarathustra who descends from his mountain retreat to share his wisdom about the Superman and the will to power.',
    ['Philosophy'],
    ['Philosophy, German', 'Nietzsche, Friedrich Wilhelm, 1844-1900']
  ),
  book(
    4705,
    'Beyond Good and Evil',
    'Friedrich Nietzsche',
    'A critique of past philosophers and their morality, in which Nietzsche expounds his own conception of a new philosopher and his ideal of "beyond good and evil."',
    ['Philosophy'],
    ['Ethics', 'Philosophy, German']
  ),
  book(
    1497,
    'The Republic',
    'Plato',
    'Plato\'s Socratic dialogue concerning justice, the just city-state, and the just man, and his proposal for the ideal society governed by philosopher-kings.',
    ['Philosophy'],
    ['Justice', 'Political science', 'Utopias']
  ),
  book(
    2386,
    'The Meditations of Marcus Aurelius',
    'Marcus Aurelius',
    'Personal writings of the Roman Emperor and Stoic philosopher, offering reflections on Stoic philosophy and guidance for living a virtuous life.',
    ['Philosophy'],
    ['Stoics', 'Ethics']
  ),
  book(
    844,
    'The Importance of Being Earnest',
    'Oscar Wilde',
    'A trivial comedy for serious people in which two men adopt the name Ernest to woo their respective loves, leading to farcical complications.',
    ['Fiction', 'Philosophy'],
    ['Comedies', 'Humour', 'Manners and customs -- Drama']
  ),

  // ── Adventure ────────────────────────────────────────────────────────────
  book(
    120,
    'Treasure Island',
    'Robert Louis Stevenson',
    'Young Jim Hawkins embarks on a voyage to find a legendary buried treasure, encountering pirates led by the cunning Long John Silver.',
    ['Popular', 'Adventure', 'Children\'s'],
    ['Pirates -- Fiction', 'Buried treasure -- Fiction', 'Sea stories']
  ),
  book(
    514,
    'Little Women',
    'Louisa May Alcott',
    'The coming-of-age story of the four March sisters — Meg, Jo, Beth, and Amy — growing up in New England during the Civil War.',
    ['Popular', 'Fiction', 'Romance', 'Children\'s'],
    ['Domestic fiction', 'Sisters -- Fiction', 'New England -- Fiction']
  ),
  book(
    1184,
    'The Count of Monte Cristo',
    'Alexandre Dumas',
    'Edmond Dantès is wrongfully imprisoned, escapes, and transforms himself into the mysterious Count of Monte Cristo to exact elaborate revenge on those who betrayed him.',
    ['Popular', 'Adventure', 'Fiction'],
    ['Adventure stories', 'Revenge -- Fiction', 'France -- History -- 19th century -- Fiction']
  ),
  book(
    1257,
    'The Three Musketeers',
    'Alexandre Dumas',
    'The adventures of D\'Artagnan, a young Gascon who travels to Paris to join the Musketeers of the Guard and befriends Athos, Porthos, and Aramis.',
    ['Adventure', 'Fiction'],
    ['Adventure stories', 'France -- History -- 17th century -- Fiction']
  ),
  book(
    103,
    'Around the World in Eighty Days',
    'Jules Verne',
    'Philieas Fogg of London wagers that he can circumnavigate the globe in eighty days, setting off on a breathtaking race against time.',
    ['Popular', 'Adventure', 'Fiction'],
    ['Adventure stories', 'Voyages around the world -- Fiction']
  ),
  book(
    164,
    'Twenty Thousand Leagues under the Sea',
    'Jules Verne',
    'Three men are captured by the enigmatic Captain Nemo aboard his advanced submarine Nautilus and taken on an extraordinary journey through the ocean depths.',
    ['Popular', 'Adventure', 'Science Fiction'],
    ['Adventure stories', 'Submarines (Ships) -- Fiction', 'Science fiction']
  ),
  book(
    16,
    'Peter Pan',
    'J. M. Barrie',
    'The story of Peter Pan, the boy who never grows up, and the Darling children who join him on a flight to Neverland.',
    ['Children\'s', 'Adventure', 'Fiction'],
    ['Fairies -- Fiction', 'Never-Never Land (Imaginary place) -- Fiction']
  ),

  // ── Horror ───────────────────────────────────────────────────────────────
  book(
    25525,
    'The Call of Cthulhu',
    'H.P. Lovecraft',
    'A tale of cosmic horror in which the investigation of a mysterious cult and a sunken city reveals an ancient, malevolent being beyond human comprehension.',
    ['Horror', 'Fiction'],
    ['Horror tales', 'Cthulhu (Fictitious character)']
  ),
  book(
    696,
    'The Turn of the Screw',
    'Henry James',
    'A governess caring for two children becomes convinced that the estate is haunted by the spirits of former servants with malevolent intentions.',
    ['Horror', 'Fiction', 'Mystery & Detective'],
    ['Ghost stories', 'Psychological fiction', 'Governesses -- Fiction']
  ),
  book(
    42,
    'The Strange Case of Dr. Jekyll and Mr. Hyde',
    'Robert Louis Stevenson',
    'London lawyer Gabriel John Utterson investigates the strange cases involving his old friend, Dr Henry Jekyll, and the hideous Edward Hyde.',
    ['Popular', 'Horror', 'Fiction', 'Mystery & Detective'],
    ['Horror tales', 'Psychological fiction', 'London (England) -- Fiction']
  ),

  // ── Poetry ───────────────────────────────────────────────────────────────
  book(
    1065,
    'The Raven and Other Poems',
    'Edgar Allan Poe',
    'A collection of poems by one of America\'s most celebrated writers, including the famous "The Raven," "Annabel Lee," and "The Bells."',
    ['Poetry'],
    ['American poetry', 'Horror tales']
  ),
  book(
    1041,
    'Leaves of Grass',
    'Walt Whitman',
    'A poetry collection that celebrates democracy, nature, love, and friendship, and is also known for its pioneering use of free verse.',
    ['Poetry'],
    ['American poetry']
  ),
  book(
    23684,
    'The Waste Land and Other Poems',
    'T.S. Eliot',
    'A landmark of modernist poetry depicting the post-World War I disillusionment through fragmented images, multiple voices, and cultural allusions.',
    ['Poetry'],
    ['Modernist poetry', 'American poetry']
  ),
  book(
    1045,
    'Songs of Innocence and of Experience',
    'William Blake',
    'Two collections of illustrated poems exploring the contrary states of the human soul: innocent childhood and the corruption of experience.',
    ['Poetry'],
    ['English poetry', 'Symbolism in literature']
  ),

  // ── Children\'s ───────────────────────────────────────────────────────────
  book(
    11,
    'Alice\'s Adventures in Wonderland',
    'Lewis Carroll',
    'Alice falls down a rabbit hole into a fantasy world populated by peculiar creatures and bizarre situations, blending logic with absurdist fiction.',
    ['Popular', 'Children\'s', 'Fiction'],
    ['Fantasy fiction', 'Humorous stories', 'Children\'s stories']
  ),
  book(
    12,
    'Through the Looking-Glass',
    'Lewis Carroll',
    'Alice enters a mirror world structured like a giant chess game, meeting the Red and White Queens and many other unforgettable characters.',
    ['Children\'s', 'Fiction'],
    ['Fantasy fiction', 'Humorous stories', 'Children\'s stories']
  ),
  book(
    74,
    'The Adventures of Tom Sawyer',
    'Mark Twain',
    'Tom Sawyer\'s boyhood adventures along the Mississippi River, including witnessing a murder, running away to live as pirates, and searching for treasure.',
    ['Children\'s', 'Adventure', 'Fiction'],
    ['Adventure stories', 'Boys -- Fiction', 'Mississippi River -- Fiction']
  ),
  book(
    5,
    'The United States Declaration of Independence',
    'Thomas Jefferson',
    'The founding document of the United States, declaring the colonies\' independence from Britain and articulating the principles of natural rights.',
    ['Philosophy'],
    ['United States -- Politics and government -- 1775-1783']
  ),
];

// ── Category map ──────────────────────────────────────────────────────────────

/**
 * Maps human-readable category names to arrays of Gutenberg book IDs.
 * Used by the library UI to populate curated shelves without extra API calls.
 */
export const categoryMap: Record<string, string[]> = {
  Popular: [
    '1342', '84', '345', '64317', '2701', '1260', '768', '174', '46', '2554',
    '2600', '1661', '2852', '35', '36', '1498', '76', '1184', '103', '164',
    '42', '11', '120', '514',
  ],
  Fiction: [
    '1342', '84', '345', '64317', '2701', '1260', '768', '174', '46', '1400',
    '2554', '2600', '600', '2097', '4300', '108', '521', '105', '161', '1322',
    '1498', '76', '844', '1184', '1257', '103', '164', '696', '42',
  ],
  'Mystery & Detective': [
    '1661', '2852', '108', '863', '2554', '696', '42', '345',
  ],
  'Science Fiction': [
    '84', '35', '36', '5230', '521', '164',
  ],
  Romance: [
    '1342', '1260', '768', '105', '161', '1322', '1498', '2097', '514',
  ],
  Philosophy: [
    '1232', '1250', '4705', '1497', '2386', '844', '600', '5230', '1080', '5',
  ],
  Adventure: [
    '2701', '76', '35', '36', '521', '120', '514', '1184', '1257', '103',
    '164', '16', '74',
  ],
  Horror: [
    '84', '345', '174', '42', '25525', '696', '521',
  ],
  Poetry: [
    '1065', '1041', '23684', '1045',
  ],
  "Children's": [
    '11', '12', '74', '120', '514', '16',
  ],
};
