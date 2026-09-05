#!/usr/bin/env bash
#
# Prepara el proyecto en macOS despues de un `git pull`.
#
# El repositorio no versiona node_modules, .env, dist/, ios/App/App/public ni
# los Pods, asi que este script reconstruye todo eso y deja el workspace de
# Xcode listo para firmar y archivar.
#
# Uso:  pnpm mac:setup

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> 1/5  Dependencias"
pnpm install --frozen-lockfile

echo "==> 2/5  Variables de entorno"
if [ -f .env ]; then
  echo "         .env ya existe, se conserva"
else
  cp .env.example .env
  echo "         .env creado desde .env.example"
fi

echo "==> 3/5  Build web y sincronizacion con iOS"
pnpm build
pnpm exec cap sync ios

echo "==> 4/5  Verificaciones"
pnpm typecheck
pnpm test
pnpm verify:release
pnpm verify:ios-plugin

echo "==> 5/5  CocoaPods"
cd ios/App
pod install

echo
echo "Listo."
echo "Abre ios/App/App.xcworkspace  (el .xcworkspace, NO el .xcodeproj)."
echo "Falta solo elegir el Team en Signing & Capabilities."
