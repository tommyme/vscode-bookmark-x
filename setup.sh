#!/bin/bash

# 检查 package.src.json 是否存在
if [ ! -f "package.src.json" ]; then
  echo "Error: package.src.json not found!"
  exit 1
fi

# 复制 package.src.json 到 package.json
cp package.src.json package.json

# 检查复制是否成功
if [ $? -ne 0 ]; then
  echo "Error: Failed to copy package.src.json to package.json!"
  exit 1
fi

# 执行 yarn install
echo "Installing dependencies..."
yarn install
yarn install -g vsce

# 检查 yarn install 是否成功
if [ $? -ne 0 ]; then
  echo "Error: yarn install failed!"
  exit 1
fi

# 执行 rollup 命令
echo "Running rollup..."
rollup -c

# 检查 rollup 是否成功
if [ $? -ne 0 ]; then
  echo "Error: rollup failed!"
  exit 1
fi

echo "Successfully installed the development environment!"