import readline from 'readline';
import prompts, { Choice } from 'prompts';
import FuzzySearch from 'fuzzy-search';

export const getUserInput = async (query: string): Promise<string> => {
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

export const renderList = async (list: Choice[], message: string) => {
  const searcher = new FuzzySearch(list, ['title'], { caseSensitive: false });
  const response = await prompts({
    choices: list,
    message,
    name: 'value',
    suggest: async (input: string) => searcher.search(input),
    type: 'autocomplete',
  });

  return response.value;
};
