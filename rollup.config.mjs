import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import _ from 'lodash';
import fs from 'fs';
import { parse } from 'jsonc-parser';

let jsons2merge = [
  'src/views/bookmark_x/contributes.jsonc',
  'src/views/quick_run/contributes.jsonc',
  'src/views/refer_link/contributes.jsonc',
  'package.src.json',
];

let outputJsonFile = 'package.json';

let jsonObjects = jsons2merge.map(filePath => {
  const data = fs.readFileSync(filePath, 'utf-8');
  return parse(data);
});

let res = jsonObjects.reduce((acc, curr) => {
  return _.mergeWith(acc, curr, (objValue, srcValue) => {
    if (Array.isArray(objValue)) {
      return objValue.concat(srcValue);
    }
  });
}, {});

fs.writeFileSync(outputJsonFile, JSON.stringify(res, null, 2));

console.log(`合并完成，结果已写入 ${outputJsonFile}`);


export default {
  input: 'src/extension.ts',  // 入口文件
  output: {
    file: 'out/extension.js',  // 输出文件
    format: 'commonjs',  // 输出格式为 CommonJS
  },
  plugins: [
    resolve({
      preferBuiltins: true,
      // exportConditions: ['node']
    }),
    commonjs(),  // 处理 CommonJS 模块
    typescript(),  // 处理 TypeScript 文件
    terser(),  // 可选，用于压缩代码
  ],
  external: ['vscode', 'fs', 'util', 'path'],  // 将 Electron 模块标记为外部依赖，不进行打包
};