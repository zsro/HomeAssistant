import { Font } from '@react-pdf/renderer';

let loading: Promise<void> | undefined;
let registered = false;

async function loadFont(fontFamily: string) {
  try {
    await Font.load({ fontFamily });
  } catch (error) {
    // The renderer retains a rejected promise; clear only this failed source.
    Font.getFont({ fontFamily }).loadResultPromise = null;
    throw error;
  }
}

export function loadPinyinFonts(paths = { chinese: '/fonts/NotoSansSC-Regular.ttf', pinyin: '/fonts/Andika-Regular.ttf' }) {
  if (!loading) {
    if (!registered) {
      Font.register({ family: 'PinyinChinese', src: paths.chinese });
      Font.register({ family: 'Andika', src: paths.pinyin });
      registered = true;
    }
    loading = Promise.all([loadFont('PinyinChinese'), loadFont('Andika')]).then(() => {
      const font = Font.getFont({ fontFamily: 'Andika' }).data;
      if (!font) throw new Error('Pinyin font did not load');
      // fontkit caches component glyphs with empty Unicode mappings when a composed
      // vowel is measured first. Populate mappings before layout so later words
      // (e.g. huā after ǖ) cannot lose letters, including across repeated downloads.
      for (const codePoint of font.characterSet) font.glyphForCodePoint(codePoint);
    }).catch((error: unknown) => {
      loading = undefined;
      throw error;
    });
  }
  return loading;
}
