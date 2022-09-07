const readline = require('readline');
const prompts = require('prompts');
const FuzzySearch = require('fuzzy-search');

module.exports.getUserInput = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
};

module.exports.renderList = async ({ list, message }) => {
  const choices = list.map((i) => ({ title: i }));

  const searcher = new FuzzySearch(choices, ['title'], {
    caseSensitive: false,
  });

  const response = await prompts({
    choices,
    message,
    name: 'value',
    suggest: (input) => searcher.search(input),
    type: 'autocomplete',
  });

  return response.value;
};
