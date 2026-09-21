"""Rebuild the small, static Chinese PDF font. Requires fonttools (OFL retained)."""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

frontend = Path(__file__).resolve().parent.parent
font = TTFont(frontend / 'public/fonts/NotoSansSC.ttf')
instantiateVariableFont(font, {'wght': 400}, inplace=True)
source = ''.join(path.read_text() for path in (frontend / 'src/features/pinyin-printables').glob('*.ts*'))
options = subset.Options()
options.name_IDs = ['*']
options.name_legacy = True
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=source + ''.join(chr(code) for code in range(32, 127)))
subsetter.subset(font)
names = {1: 'HomeAssistant Pinyin SC', 2: 'Regular', 3: 'HomeAssistantPinyinSC-Regular', 4: 'HomeAssistant Pinyin SC Regular', 6: 'HomeAssistantPinyinSC-Regular'}
for record in font['name'].names:
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding())
font.save(frontend / 'public/fonts/NotoSansSC-Regular.ttf')
