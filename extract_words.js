const fs = require('fs');
const content = fs.readFileSync('game/wordle-clone-main/script.js', 'utf8');

// Extract targetWords (first big array in file)
const targetMatch = content.match(/^const targetWords = \[([\s\S]*?)\]\s*const dictionary/m);
if (!targetMatch) { console.log('NO TARGET MATCH'); process.exit(1); }
const targetWords = targetMatch[1].match(/"([a-z]{5})"/g).map(function(w) { return w.replace(/"/g, ''); });
console.log('Target words count: ' + targetWords.length);

// Extract dictionary words
const dictMatch = content.match(/const dictionary = \[([\s\S]*?)\]\s*const WORD_LENGTH/m);
if (!dictMatch) { console.log('NO DICT MATCH'); process.exit(1); }
const dictWords = dictMatch[1].match(/"([a-z]{5})"/g).map(function(w) { return w.replace(/"/g, ''); });
console.log('Dictionary count: ' + dictWords.length);

// Write targetWords as Dart const list
const dartTarget = 'const List<String> kTargetWords = [\n' + targetWords.map(function(w) { return '  "' + w + '"'; }).join(',\n') + ',\n];\n';
fs.writeFileSync('target_words_temp.txt', dartTarget);

// Write dictionary as JSON asset (combined - target words are also valid guesses)
const allWords = Array.from(new Set(targetWords.concat(dictWords)));
fs.writeFileSync('dictionary_temp.json', JSON.stringify(allWords));
console.log('All valid words: ' + allWords.length);
console.log('Files written successfully!');
