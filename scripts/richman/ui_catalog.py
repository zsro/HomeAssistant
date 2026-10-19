"""UI-00 evidence-backed selection; resource IDs are for the pinned base game only."""

SOURCE_HASHES = {
    'Data.mkf': 'c63023e815b1ad4bef172b6415d128c7f041f12b71b5d80dc3ff29240a0a1988',
    'Panel.mkf': '5b9bfd11a866694cfdf93457d2010d30f20a43f96b668e5186fa99452e16f563',
    'map.mkf': '717aaa1c1becf277064d29772500027427d39488bad64a7ee42875975c0e7106',
    'rich4.exe': '110b29f9d2fadcff3836eb69ec380aa264951859c90955da6e11158d2f956a13',
}

REFERENCE_COMMIT = 'ec7d70e693059d1e781d9d1cc2ad7f36d360d39e'
REFERENCE_ROOT = f'https://github.com/mytbk/rich4/blob/{REFERENCE_COMMIT}/'
REFERENCES = {
    'toolbarDispatch': REFERENCE_ROOT + 'asm/rich4_ui_clicking_top_panel.asm',
    'panelDrawing': REFERENCE_ROOT + 'asm/rich4.asm',
    'anchorConvention': REFERENCE_ROOT + 'csrc/drawing.c',
    'titleMenu': REFERENCE_ROOT + 'asm/rich4_ui_main.asm',
    'bank': REFERENCE_ROOT + 'asm/rich4_ui_bank.asm',
}

# Graphs are exported for inspection, not automatically admitted to release-assets.json.
SELECTION = {
    'Data.mkf': {
        1: ('title-menu', 'local-art', '9 帧：标题及 START/LOAD/OPTION/EXIT 两组图；热区未冻结'),
        2: ('character-icons', 'local-art', '12 张 72×72 角色头像'),
        3: ('options-parts', 'local-art', '设置、表格、日期窗口零件；逐项触发条件待核实'),
    },
    'Panel.mkf': {
        0: ('player-panel', 'native-static', '资料背景；字段坐标与各配置显示规则待核实'),
        1: ('toolbar', 'native-static+reference', '11 个入口，正常帧 1..11，悬停帧 12..22'),
        2: ('season-calendar', 'local-art', '季节背景、日历及日月零件；辅助区切换规则待核实'),
        3: ('dice', 'local-art', '已接入地图的骰子；原始锚点保留，不当作 CSS 偏移直接应用'),
        7: ('go-control', 'native-static', 'GO/STOP/慢行图及骰数选择零件；与 Panel[8] 区别处理'),
        9: ('window-09-candidate', 'unresolved', '全屏业务窗口候选；身份和热区未冻结'),
        10: ('window-10-candidate', 'unresolved', '全屏业务窗口候选；身份和热区未冻结'),
        21: ('number-input-candidate', 'local-art', '数字键盘图形；业务绑定待核实'),
        23: ('bank-candidate', 'local-art+reference', '银行画面；内部控件、帧状态待核实'),
        24: ('atm-candidate', 'local-art', 'ATM 图形；内部热区待核实'),
        25: ('window-25-candidate', 'unresolved', '全屏画面及对话零件；不得统称为已核实表情包'),
        26: ('window-26-candidate', 'unresolved', '全屏业务窗口候选；身份和帧状态未冻结'),
    },
}

TOOLBAR = [
    ('help', '帮助', 0x41759C, 0x44D468),
    ('options', '设置', 0x4175AA, 0x4114A7),
    ('ai-settings', '托管设置', 0x4175B3, 0x41DAE8),
    ('load', '读档', 0x4175BA, 0x403CA6),
    ('save', '存档', 0x4175C8, 0x40407A),
    ('small-map', '小地图', 0x4175CF, 0x40A5C8),
    ('player-info', '人物资料', 0x4175D6, 0x423B4C),
    ('tools', '道具', 0x4175DD, 0x446948),
    ('cards', '卡片', 0x4175E4, 0x4407F7),
    ('sale', '地产出售', 0x4175EB, 0x427A79),
    ('stock', '股票', 0x4175F2, 0x42AAFD),
]

LAYOUT = [
    dict(id='toolbar', rect=[0, 0, 440, 40], evidence='toolbar-rect'),
    dict(id='map', rect=[0, 40, 440, 440], evidence='map-rect'),
    dict(id='player', rect=[440, 0, 200, 280], evidence='player-rect'),
    dict(id='auxiliary', rect=[440, 280, 200, 200], evidence='auxiliary-rect'),
]

# Byte spans inspected with x86 static disassembly. Semantic names are cross-referenced
# to the pinned reconstruction, whose absolute addresses differ from this local EXE.
# End addresses are exclusive. Exported spans make the evidence independently inspectable.
NATIVE_SPANS = [
    ('toolbar-render', 0x41562E, 0x4156E8, '中心 (40*i+20,20)，常态帧 i+1，悬停帧 i+12'),
    ('toolbar-rect', 0x4156FF, 0x415718, 'RECT: left=0 top=0 right=440 bottom=40'),
    ('map-rect', 0x4157E3, 0x415800, 'RECT: left=0 top=40 right=440 bottom=480'),
    ('player-rect', 0x415976, 0x415994, 'RECT: left=440 top=0 right=640 bottom=280'),
    ('auxiliary-rect', 0x41665D, 0x41667C, 'RECT: left=440 top=280 right=640 bottom=480'),
    ('toolbar-jump-table', 0x417536, 0x417562, '11 个分支地址；语义名称参照固定版本的 dispatcher'),
    ('toolbar-dispatch', 0x417562, 0x4175FC, '11 个入口分支及 call 目标'),
    ('toolbar-click', 0x417E6C, 0x417E9E, 'x<440,y<40，编号 floor(x/40)+100'),
    ('toolbar-hover', 0x418306, 0x41835F, '鼠标移动更新当前图标；离开后 -1；因此第二组是悬停态'),
    ('panel-load', 0x4188CC, 0x418982, 'Panel[0/1/2/3/7/8] 分别存入对应绘制/掩码指针'),
    ('go-draw', 0x416B0B, 0x416B44, 'GO 使用全局 x=0x47310c,y=0x473110；帧来自 Panel[7]'),
    ('go-hit-mask', 0x41796E, 0x4179D5, '局部坐标索引 Panel[8] 原始字节，结果加 10'),
    ('go-drag', 0x41826F, 0x418306, '鼠标拖动更新 GO 坐标，限制在 640×480 画面内'),
    ('go-default', 0x47310C, 0x473114, '静态初值 x=180,y=120；不代表所有运行/存档位置'),
]

CHARACTERS = [
    dict(id='xiaomei', label='孙小美', characterIndex=9, body=276, portrait=24),
    dict(id='tuu', label='阿土伯', characterIndex=4, body=171, portrait=19),
    dict(id='chyan', label='钱夫人', characterIndex=3, body=150, portrait=18),
    dict(id='salonbus', label='沙隆巴斯', characterIndex=1, body=108, portrait=16),
]
