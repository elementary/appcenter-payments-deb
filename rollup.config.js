import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/worker.js',
      format: 'es',
      exports: 'named',
      sourcemap: false
    }
  ],
  plugins: [
    typescript(),
    commonjs({
      include: ['node_modules/**']
    })
  ]
}
