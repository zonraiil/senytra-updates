const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Eski ortak anahtar (lisansla aynı). 2.5.0 ve öncesi yalnız bunu tanır; geçiş
// süresince manifest bununla da imzalanır.
const EXPECTED_PUBLIC_KEY_SHA256 = 'dfd884c49270e1163a9800527f077198cf3a8f71e76ef0275a95d692c411baaa'
// Yalnız güncelleme için ayrılmış anahtarlar. scripts/generate-update-key.js
// buraya ve src/main/updateKeys.js'e aynı kaydı yazar; ikisi testte karşılaştırılır.
const DEDICATED_UPDATE_KEYS = [
  // senytra-update-keys:begin
  { id:'update-2026-10', publicKey:"-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAAMcXP3FinMNOhSgvDBxc5xawLQKXZpy9O3cjlW/nK0I=\n-----END PUBLIC KEY-----\n", sha256:'eab7ea7674529c0655841d90a6a80a95285a8f915121abb774cdeb9bce5c30ab' },
  // senytra-update-keys:end
]
const args = process.argv.slice(2)
const value = name => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? String(args[index + 1] || '').trim() : ''
}
const required = name => {
  const result = value(name)
  if (!result) throw new Error(`--${name} gerekli`)
  return result
}
const resolveFile = name => path.resolve(required(name))

function releaseNotes(file) {
  if (!file || !fs.existsSync(file)) return ['Performans, güvenlik ve kararlılık iyileştirmeleri.']
  const notes = fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim().replace(/^#{1,6}\s*/, '').replace(/^[-*+]\s+/, ''))
    .filter(line => line && !/^```/.test(line))
    .slice(0, 40)
  return notes.length ? notes : ['Performans, güvenlik ve kararlılık iyileştirmeleri.']
}

function fingerprintOf(privateKey) {
  const publicDer = crypto.createPublicKey(privateKey).export({ type:'spki', format:'der' })
  return crypto.createHash('sha256').update(publicDer).digest('hex')
}

function readKey(file, label) {
  if (!file) return null
  const resolved = path.resolve(file)
  if (!fs.existsSync(resolved)) throw new Error(`${label} bulunamadı: ${resolved}`)
  const privateKey = fs.readFileSync(resolved, 'utf8')
  if (crypto.createPrivateKey(privateKey).asymmetricKeyType !== 'ed25519') throw new Error(`${label} Ed25519 olmalıdır`)
  return privateKey
}

function main() {
  const version = required('version')
  const download = required('download')
  const installer = resolveFile('installer')
  const output = resolveFile('out')
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Sürüm 2.0.0 biçiminde olmalıdır')
  if (!/^https:\/\//i.test(download) || /[\[\]()]/.test(download)) throw new Error('İndirme adresi normal bir HTTPS adresi olmalıdır')
  if (!fs.existsSync(installer)) throw new Error(`Kurucu bulunamadı: ${installer}`)

  // --private-key: eski ortak anahtar (2.5.0 ve öncesi için). --update-private-key:
  // yalnız güncelleme için ayrılmış anahtar. Geçiş süresince ikisi birlikte verilir.
  const privateKey = readKey(value('private-key'), 'Eski güncelleme anahtarı')
  const updatePrivateKey = readKey(value('update-private-key'), 'Ayrı güncelleme anahtarı')
  if (!privateKey && !updatePrivateKey) throw new Error('--private-key ya da --update-private-key gerekli')
  if (privateKey && fingerprintOf(privateKey) !== EXPECTED_PUBLIC_KEY_SHA256) throw new Error('Eski imzalama anahtarı Senytra’nın eski güncelleme anahtarıyla eşleşmiyor')
  let dedicated = null
  if (updatePrivateKey) {
    const fingerprint = fingerprintOf(updatePrivateKey)
    if (fingerprint === EXPECTED_PUBLIC_KEY_SHA256) throw new Error('Ayrı güncelleme anahtarı lisans anahtarıyla aynı olamaz')
    dedicated = DEDICATED_UPDATE_KEYS.find(key => key.sha256 === fingerprint)
    if (!dedicated) throw new Error('Ayrı güncelleme anahtarı bu Senytra sürümünde kayıtlı değil')
  }

  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(installer)).digest('hex')
  const manifest = {
    version,
    channel:'stable',
    download,
    sha256,
    changelog:releaseNotes(value('notes-file')),
    schemaVersion:1,
    product:'Senytra',
  }
  const payload = Buffer.from(JSON.stringify(manifest)).toString('base64url')
  const sign = key => crypto.sign(null, Buffer.from(payload), key).toString('base64url')
  const transition = {
    version:manifest.version,
    channel:manifest.channel,
    download:manifest.download,
    sha256:manifest.sha256,
    changelog:manifest.changelog,
    payload,
  }
  if (privateKey) transition.signature = sign(privateKey)
  if (dedicated) transition.signatures = { [dedicated.id]: sign(updatePrivateKey) }
  fs.mkdirSync(path.dirname(output), { recursive:true })
  fs.writeFileSync(output, JSON.stringify(transition, null, 2) + '\n', { encoding:'utf8', mode:0o600 })

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  const verifies = (key, signature) => crypto.verify(null, Buffer.from(payload), crypto.createPublicKey(key), Buffer.from(signature, 'base64url'))
  const valid = (!privateKey || verifies(privateKey, transition.signature)) && (!dedicated || verifies(updatePrivateKey, transition.signatures[dedicated.id]))
  if (!valid || decoded.sha256 !== sha256 || decoded.version !== version) throw new Error('Oluşturulan manifest son doğrulamadan geçmedi')
  console.log(`Güncelleme manifesti hazır: v${version}`)
  console.log(`İmzalar: ${[privateKey ? 'eski ortak anahtar' : '', dedicated ? `ayrı anahtar (${dedicated.id})` : ''].filter(Boolean).join(' + ')}`)
  console.log(`Kurucu SHA-256: ${sha256}`)
}

try { main() } catch (error) {
  console.error(`HATA: ${error.message}`)
  process.exitCode = 1
}

