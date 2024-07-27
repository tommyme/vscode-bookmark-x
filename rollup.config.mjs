import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';
import merge from 'rollup-plugin-merge';


export default {
  input: 'src/extension.ts',  // 入口文件
  output: {
    file: 'out/extension.js',  // 输出文件
    format: 'commonjs',  // 输出格式为 CommonJS
  },
  plugins: [
    resolve({
      preferBuiltins: true,
    }),
    typescript(),  // 处理 TypeScript 文件
    terser(),  // 可选，用于压缩代码
    merge({
      input: ['src/contributes.json', 'package.src.json'],
      output: 'package.json',
      verbose: true,
      // watch: true,
      recurisve: true,
      prettify: true
    }),
  ],
  external: ['vscode', 'fs', 'util'],  // 将 Electron 模块标记为外部依赖，不进行打包
};
