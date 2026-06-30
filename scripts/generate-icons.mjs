import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import png2icons from 'png2icons'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const svgPath = resolve(root, 'src/assets/mymd-icon.svg')
const outDir = resolve(root, 'resources')

const icoSizes = [16, 32, 48, 64, 128, 256]

async function main() {
  const svg = await readFile(svgPath)
  await mkdir(outDir, { recursive: true })

  const png256 = await sharp(svg).resize(256, 256).png().toBuffer()
  const png512 = await sharp(svg).resize(512, 512).png().toBuffer()
  await writeFile(resolve(outDir, 'icon.png'), png512)

  const icoPngs = await Promise.all(
    icoSizes.map((size) => sharp(svg).resize(size, size).png().toBuffer())
  )
  await writeFile(resolve(outDir, 'icon.ico'), await pngToIco(icoPngs))

  const icns = png2icons.createICNS(png256, png2icons.BICUBIC, 0)
  if (!icns) throw new Error('Failed to generate icon.icns')
  await writeFile(resolve(outDir, 'icon.icns'), icns)

  console.log('Generated resources/icon.png, icon.ico, icon.icns')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
