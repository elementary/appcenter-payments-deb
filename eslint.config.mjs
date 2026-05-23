import neostandard from 'neostandard'

export default [
  {
    ignores: ['dist/', 'worker-configuration.d.ts']
  },
  ...neostandard({ ts: true })
]
