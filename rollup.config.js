import babel from 'rollup-plugin-babel'
import { terser } from 'rollup-plugin-terser'

export default {
  input: './lib/index.js',
  output: {
    file: './dist/bundle.js',
    format: 'iife',
  },
  plugins: [
    babel({
      exclude: 'node_modules/**' // 仅仅转译我们的源码
    }),
    terser({
      compress: {
        drop_console: true
      }
    })
  ]
}