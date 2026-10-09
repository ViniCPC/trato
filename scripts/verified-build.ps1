$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$temporary = Join-Path ([System.IO.Path]::GetTempPath()) 'trato-anchor-verified'
$expectedTemporary = [System.IO.Path]::GetFullPath((Join-Path ([System.IO.Path]::GetTempPath()) 'trato-anchor-verified'))

if ([System.IO.Path]::GetFullPath($temporary) -ne $expectedTemporary) {
  throw 'Diretório temporário inesperado; build cancelado.'
}

if (Test-Path -LiteralPath $temporary) {
  Remove-Item -LiteralPath $temporary -Recurse -Force
}
New-Item -ItemType Directory -Path $temporary | Out-Null
Copy-Item -Path (Join-Path $repo 'Anchor.toml'), (Join-Path $repo 'Cargo.toml'), (Join-Path $repo 'Cargo.lock'), (Join-Path $repo 'rust-toolchain.toml'), (Join-Path $repo 'programs') -Destination $temporary -Recurse

Push-Location $temporary
try {
  anchor build --verifiable --ignore-keys
} finally {
  Pop-Location
}

Write-Host "Verifiable build concluído em $temporary/target/verifiable"
