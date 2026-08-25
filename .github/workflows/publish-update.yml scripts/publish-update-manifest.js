const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const EXPECTED_PUBLIC_KEY_SHA256 = 'dfd884c49270e1163a9800527f077198cf3a8f71e76ef0275a95d692c411baaa'
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

function main() {
  const version = required('version')
  const download = required('download')
  const installer = resolveFile('installer')
  const privateKeyPath = resolveFile('private-key')
  const output = resolveFile('out')
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Sürüm 2.0.0 biçiminde olmalıdır')
  if (!/^https:\/\//i.test(download) || /[\[\]()]/.test(download)) throw new Error('İndirme adresi normal bir HTTPS adresi olmalıdır')
  if (!fs.existsSync(installer)) throw new Error(`Kurucu bulunamadı: ${installer}`)
  if (!fs.existsSync(privateKeyPath)) throw new Error(`İmzalama anahtarı bulunamadı: ${privateKeyPath}`)

  const privateKey = fs.readFileSync(privateKeyPath, 'utf8')
  const publicDer = crypto.createPublicKey(privateKey).export({ type:'spki', format:'der' })
  const fingerprint = crypto.createHash('sha256').update(publicDer).digest('hex')
  if (fingerprint !== EXPECTED_PUBLIC_KEY_SHA256) throw new Error('İmzalama anahtarı bu Spectra sürümünün güncelleme anahtarıyla eşleşmiyor')

  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(installer)).digest('hex')
  const manifest = {
    version,
    channel:'stable',
    download,
    sha256,
    changelog:releaseNotes(value('notes-file')),
    schemaVersion:1,
    product:'Spectra',
  }
  const payload = Buffer.from(JSON.stringify(manifest)).toString('base64url')
  const signature = crypto.sign(null, Buffer.from(payload), privateKey).toString('base64url')
  const transition = {
    version:manifest.version,
    channel:manifest.channel,
    download:manifest.download,
    sha256:manifest.sha256,
    changelog:manifest.changelog,
    payload,
    signature,
  }
  fs.mkdirSync(path.dirname(output), { recursive:true })
  fs.writeFileSync(output, JSON.stringify(transition, null, 2) + '\n', { encoding:'utf8', mode:0o600 })

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  const valid = crypto.verify(null, Buffer.from(payload), crypto.createPublicKey(privateKey), Buffer.from(signature, 'base64url'))
  if (!valid || decoded.sha256 !== sha256 || decoded.version !== version) throw new Error('Oluşturulan manifest son doğrulamadan geçmedi')
  console.log(`Güncelleme manifesti hazır: v${version}`)
  console.log(`Kurucu SHA-256: ${sha256}`)
}

try { main() } catch (error) {
  console.error(`HATA: ${error.message}`)
  process.exitCode = 1
}

