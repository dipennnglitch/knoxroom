const FACTS = {
  science: [
    "A day on Venus is longer than a year on Venus. It takes 243 Earth days to rotate once, but only 225 Earth days to orbit the Sun.",
    "Octopuses have three hearts and blue blood. Two hearts pump blood to the gills, while the third pumps it to the rest of the body.",
    "There are more trees on Earth than stars in the Milky Way. Estimates put trees at around 3 trillion vs ~100–400 billion stars.",
    "Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible.",
    "A single cloud can weigh more than a million pounds. The water droplets are tiny and spread out, so they stay aloft.",
    "Bananas are berries, but strawberries aren't. Botanically, bananas qualify; strawberries are aggregate accessory fruits.",
    "The human body contains enough iron to make a 3-inch nail and enough carbon to make 900 pencils.",
    "Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.",
    "Neutron stars are so dense that a teaspoon of their material would weigh about 6 billion tons.",
    "The smell of rain has a name: petrichor. It's caused by oils from plants and geosmin from soil bacteria."
  ],
  arts: [
    "The Mona Lisa has no eyebrows. It was the fashion in Renaissance Florence to shave them off.",
    "Vincent van Gogh only sold one painting during his lifetime: The Red Vineyard.",
    "The color 'magenta' is named after the Battle of Magenta in 1859, not the other way around.",
    "Beethoven composed some of his greatest works after he went completely deaf.",
    "The Louvre in Paris would take you about 100 days to see every piece of art if you spent 30 seconds on each.",
    "Picasso's full name has 23 words: Pablo Diego José Francisco de Paula Juan Nepomuceno María de los Remedios Cipriano de la Santísima Trinidad Ruiz y Picasso.",
    "The world's oldest known musical instrument is a 40,000-year-old flute made from a vulture bone.",
    "Jackson Pollock's paintings have been analyzed and found to contain fractal patterns similar to those in nature.",
    "The Sistine Chapel ceiling took Michelangelo four years to paint (1508–1512).",
    "There's a museum in Croatia dedicated entirely to broken relationships."
  ],
  earth: [
    "Earth is the only planet not named after a Greek or Roman god. It comes from Old English and Germanic words for 'ground'.",
    "The Amazon rainforest produces about 20% of the world's oxygen, though most oxygen comes from ocean phytoplankton.",
    "There is a place in the Pacific Ocean called Point Nemo that is farther from land than anywhere else on Earth.",
    "Mount Everest grows about 4 mm every year due to tectonic plate movement.",
    "The deepest part of the ocean, the Challenger Deep, is deeper than Mount Everest is tall.",
    "Antarctica is the world's largest desert. A desert is defined by low precipitation, not heat.",
    "The Earth's core is as hot as the surface of the Sun — about 5,500°C (9,900°F).",
    "Lightning strikes Earth about 100 times every second.",
    "The Pacific Ocean is larger than all the landmasses on Earth combined.",
    "A teaspoon of soil can contain more microorganisms than there are people on Earth."
  ],
  animals: [
    "A group of flamingos is called a flamboyance.",
    "Cows have best friends and get stressed when they are separated.",
    "Otters hold hands while sleeping so they don't drift apart.",
    "A shrimp's heart is located in its head.",
    "Goats have rectangular pupils that give them a wide field of vision to detect predators.",
    "The heart of a blue whale is the size of a small car and can be heard from 3 km away.",
    "Sloths can hold their breath longer than dolphins — up to 40 minutes by slowing their heart rate.",
    "A group of crows is called a murder. A group of owls is a parliament.",
    "Elephants are the only animals that can't jump.",
    "Wombat poop is cube-shaped. This helps it mark territory without rolling away."
  ],
  movies: [
    "The original Star Wars was rejected by several studios before 20th Century Fox took it on.",
    "In The Matrix, Neo's passport expires on September 11, 2001 — a strange coincidence filmed before the attacks.",
    "The Wilhelm Scream has been used in over 400 films and TV shows since 1951.",
    "Toy Story was the first feature-length film completely made with CGI.",
    "The lion roar in the MGM logo is actually a tiger. The original lion was named Volney.",
    "In Psycho (1960), the blood in the shower scene was actually chocolate syrup.",
    "The code in The Matrix is just sushi recipes scanned from a Japanese cookbook.",
    "James Cameron drew the famous nude sketch of Rose in Titanic himself.",
    "The first movie ever made was Roundhay Garden Scene (1888) — it lasts only 2.11 seconds.",
    "In Avengers: Endgame, the final battle had so many characters that some VFX artists worked on a single frame for months."
  ],
  space: [
    "There are more possible games of chess than atoms in the observable universe.",
    "One million Earths could fit inside the Sun.",
    "The footprints left by Apollo astronauts on the Moon will likely last millions of years — there's no wind or water to erode them.",
    "A year on Mercury is just 88 Earth days long.",
    "Saturn's rings are made mostly of ice particles ranging from tiny grains to house-sized chunks.",
    "If you could drive a car to the Sun at highway speeds, it would take more than 100 years.",
    "The largest known star, UY Scuti, is so big that if it replaced our Sun, it would extend beyond Jupiter's orbit.",
    "Space is completely silent because there is no air for sound waves to travel through.",
    "The International Space Station travels at about 28,000 km/h and orbits Earth every 90 minutes.",
    "There is a giant cloud of alcohol in space (sagittarius B2) large enough to fill 400 trillion trillion pints of beer."
  ],
  random: [
    "The inventor of the Pringles can is now buried in one.",
    "A jiffy is an actual unit of time: 1/100th of a second.",
    "Scotland's national animal is the unicorn.",
    "The shortest war in history lasted 38 minutes (Britain vs Zanzibar, 1896).",
    "A bolt of lightning is five times hotter than the surface of the Sun.",
    "The average person walks the equivalent of three times around the world in a lifetime.",
    "Cleopatra lived closer in time to the first Moon landing than to the building of the Great Pyramid.",
    "There are more possible iterations of a game of Go than there are atoms in the universe.",
    "The first computer 'bug' was an actual moth found in a Harvard Mark II computer in 1947.",
    "A group of pandas is called an embarrassment."
  ]
};

function getRandomFact(category = null) {
  const cats = category && FACTS[category] ? [category] : Object.keys(FACTS);
  const chosenCat = cats[Math.floor(Math.random() * cats.length)];
  const list = FACTS[chosenCat];
  const fact = list[Math.floor(Math.random() * list.length)];
  return { category: chosenCat, fact };
}

function getAllCategories() {
  return Object.keys(FACTS);
}
