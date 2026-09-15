name: Spectra güncellemesini yayınla

on:
  release:
    types: [published]

permissions:
  contents: write

concurrency:
  group: spectra-stable-update
  cancel-in-progress: false

jobs:
  publish-manifest:
    runs-on: windows-latest
    steps:
      - name: Ana dalı al
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Node.js kur
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Release bilgilerini doğrula ve kurucuyu indir
        shell: pwsh
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          RELEASE_TAG: ${{ github.event.release.tag_name }}
          RELEASE_ID: ${{ github.event.release.id }}
          RELEASE_NOTES: ${{ github.event.release.body }}
        run: |
          if ($env:RELEASE_TAG -notmatch '^v(\d+\.\d+\.\d+)$') {
            throw "Release etiketi v2.0.0 biçiminde olmalıdır: $env:RELEASE_TAG"
          }
          $version = $Matches[1]
          $assetName = "Spectra-Setup-v$version-x64.exe"
          $release = gh api "repos/$env:GITHUB_REPOSITORY/releases/$env:RELEASE_ID" | ConvertFrom-Json
          if ($LASTEXITCODE -ne 0) { throw 'GitHub Release bilgisi okunamadı.' }
          $asset = $release.assets | Where-Object { $_.name -eq $assetName } | Select-Object -First 1
          if (-not $asset) {
            throw "Release içinde beklenen kurucu yok: $assetName"
          }
          New-Item -ItemType Directory -Force -Path '.release-artifacts' | Out-Null
          gh release download $env:RELEASE_TAG --pattern $assetName --dir '.release-artifacts' --clobber
          if ($LASTEXITCODE -ne 0) { throw 'Kurucu GitHub Release üzerinden indirilemedi.' }
          [IO.File]::WriteAllText((Join-Path $env:RUNNER_TEMP 'spectra-release-notes.txt'), [string]$env:RELEASE_NOTES, [Text.UTF8Encoding]::new($false))
          "SPECTRA_VERSION=$version" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
          "SPECTRA_ASSET_NAME=$assetName" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
          "SPECTRA_DOWNLOAD_URL=$($asset.browser_download_url)" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append

      - name: Güncelleme imzalama anahtarını hazırla
        shell: pwsh
        env:
          UPDATE_PRIVATE_KEY_B64: ${{ secrets.SPECTRA_UPDATE_PRIVATE_KEY_B64 }}
        run: |
          if ([string]::IsNullOrWhiteSpace($env:UPDATE_PRIVATE_KEY_B64)) {
            throw 'SPECTRA_UPDATE_PRIVATE_KEY_B64 GitHub Actions sırrı tanımlanmamış.'
          }
          try {
            $bytes = [Convert]::FromBase64String($env:UPDATE_PRIVATE_KEY_B64)
          } catch {
            throw 'SPECTRA_UPDATE_PRIVATE_KEY_B64 geçerli Base64 değil.'
          }
          $keyPath = Join-Path $env:RUNNER_TEMP 'spectra-update-private.pem'
          [IO.File]::WriteAllBytes($keyPath, $bytes)
          "SPECTRA_PRIVATE_KEY_PATH=$keyPath" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append

      - name: İmzalı geçiş manifestini oluştur
        shell: pwsh
        run: |
          node scripts/publish-update-manifest.js `
            --version $env:SPECTRA_VERSION `
            --installer ".release-artifacts\$env:SPECTRA_ASSET_NAME" `
            --download $env:SPECTRA_DOWNLOAD_URL `
            --notes-file "$env:RUNNER_TEMP\spectra-release-notes.txt" `
            --private-key $env:SPECTRA_PRIVATE_KEY_PATH `
            --out update-stable.json
          if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

      - name: Manifesti ana dala gönder
        shell: pwsh
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add -- update-stable.json
          if (git diff --cached --quiet) {
            Write-Host 'Manifest zaten güncel.'
            exit 0
          }
          git commit -m "Yayın manifestini v$env:SPECTRA_VERSION sürümüne güncelle"
          git push origin HEAD:main
