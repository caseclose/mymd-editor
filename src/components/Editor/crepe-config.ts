import { Crepe } from '@milkdown/crepe'

export function createCrepeOptions(
  root: HTMLElement,
  content: string,
  uploadImage: (file: File) => Promise<string>
): ConstructorParameters<typeof Crepe>[0] {
  return {
    root,
    defaultValue: content,
    features: {
      [Crepe.Feature.Latex]: true,
      [Crepe.Feature.Toolbar]: true,
      [Crepe.Feature.CodeMirror]: true,
      [Crepe.Feature.Table]: true,
      [Crepe.Feature.ImageBlock]: true
    },
    featureConfigs: {
      [Crepe.Feature.Placeholder]: {
        text: '开始编写 Markdown...',
        mode: 'block'
      },
      [Crepe.Feature.ImageBlock]: {
        onUpload: uploadImage,
        blockOnUpload: uploadImage,
        inlineOnUpload: uploadImage,
        proxyDomURL: (url) => url
      }
    }
  }
}
