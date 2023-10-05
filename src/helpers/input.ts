import readline from 'readline'
import prompts, { Choice } from 'prompts'
import FuzzySearch from 'fuzzy-search'

const input = async (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer)
    })
  )
}

const confirm = async (query: string) => {
  const response = await prompts({
    type: 'toggle',
    name: 'value',
    message: query,
    initial: false,
    active: 'yes',
    inactive: 'no',
  })

  return response.value
}

export const renderList = async (list: Choice[], message: string, lastSelectedProfile = 0) => {
  const searcher = new FuzzySearch(list, ['title'], { caseSensitive: false })
  const response = await prompts({
    choices: list,
    message,
    name: 'value',
    suggest: async (input: string) => searcher.search(input),
    type: 'autocomplete',
    initial: lastSelectedProfile,
  })

  return response.value
}

export const prompt = {
  input,
  confirm,
}
