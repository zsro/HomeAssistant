import { Document, Line, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import { Picture } from './Picture';
import { ACTIVITY_HEIGHT, WORD_ROW_HEIGHT } from './layout';
import { levelLabels, topicLabels } from './types';
import type { PinyinActivity, PinyinWorksheet } from './types';

const styles = StyleSheet.create({
  page: { fontFamily: 'PinyinChinese', fontSize: 10, color: '#252525', backgroundColor: '#fff' },
  frame: { height: 841.89, flexShrink: 0 },
  header: { position: 'absolute', top: 28, left: 34, right: 34, height: 60, borderBottomWidth: 1.1, borderColor: '#333' },
  title: { fontSize: 19 },
  meta: { fontSize: 8, color: '#606060', marginTop: 7 },
  headerNote: { position: 'absolute', right: 0, top: 5, fontSize: 9, color: '#606060' },
  content: { position: 'absolute', top: 97, left: 34, right: 34 },
  activity: { height: ACTIVITY_HEIGHT, paddingHorizontal: 10, paddingTop: 7, borderBottomWidth: 0.6, borderColor: '#bbb' },
  sectionTitle: { fontSize: 13 },
  hint: { marginTop: 6, fontSize: 9, color: '#555', lineHeight: 1.5 },
  pinyin: { fontFamily: 'Andika', fontSize: 24, lineHeight: 1.2 },
  smallPinyin: { fontFamily: 'Andika', fontSize: 20, lineHeight: 1.1, width: 300, flexShrink: 0 },
  row: { flexDirection: 'row', alignItems: 'center', height: 39 },
  index: { width: 25, fontSize: 8, color: '#777' },
  target: { width: 85, fontFamily: 'Andika', fontSize: 26, lineHeight: 1.2 },
  choice: { width: 78, textAlign: 'center', fontFamily: 'Andika', fontSize: 24, lineHeight: 1.15, paddingVertical: 2 },
  example: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 3, height: 28, paddingHorizontal: 10, backgroundColor: '#f3f3f3' },
  exampleLabel: { fontSize: 9, marginRight: 20 },
  matchRow: { height: 39, flexDirection: 'row', alignItems: 'center' },
  matchLeft: { width: 190, flexDirection: 'row', alignItems: 'center' },
  matchSpace: { width: 90, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 },
  dot: { width: 4, height: 4, backgroundColor: '#333', borderRadius: 2 },
  matchRight: { width: 195, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  rightLabel: { width: 25, fontSize: 9, marginLeft: 22 },
  writeLabels: { flexDirection: 'row', marginTop: 5, marginBottom: 0, fontSize: 8, color: '#666' },
  writeLabel: { width: '25%', paddingLeft: 10 },
  footer: { position: 'absolute', top: 803, left: 34, right: 34, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#666' },
});

const hints = {
  recognition: '读读左边的字母，再圈出右边和它相同的一个。',
  tones: '跟着声调线，边读边用手比画。每一行都慢慢读一遍。',
  writing: '先读范字，描一次，再自己写两次。写完再读给家人听。',
};
const toneNames = ['一声', '二声', '三声', '四声'];

function ToneLine({ tone }: { tone: number }) {
  const paths = ['M8 8 L35 8', 'M8 17 L35 3', 'M8 6 L21 19 L35 3', 'M8 3 L35 17'];
  return <Svg width={43} height={23} viewBox="0 0 43 23"><Path d={paths[tone]} stroke="#555" strokeWidth={1.4} fill="none" /></Svg>;
}

function WritingGrid({ model }: { model: string }) {
  return <Svg width={500} height={50} viewBox="0 0 500 50">
    {[9, 20, 31, 42].map((y, index) => <Line key={y} x1={0} y1={y} x2={500} y2={y} stroke={index === 2 ? '#777' : '#aaa'} strokeWidth={index === 2 ? 0.8 : 0.5} />)}
    {[125, 250, 375].map((x) => <Line key={x} x1={x} y1={9} x2={x} y2={42} stroke="#ccc" strokeWidth={0.5} strokeDasharray="3 3" />)}
    {[0, 1].map((column) => <Text key={column} x={column * 125 + 15} y={31} style={{ fontFamily: 'Andika', fontSize: 21.65 }} fill={column === 1 ? '#aaa' : '#252525'}>{model}</Text>)}
  </Svg>;
}

function Activity({ activity, number }: { activity: PinyinActivity; number: number }) {
  return <View style={[styles.activity, { height: activity.units * ACTIVITY_HEIGHT }]} wrap={false}>
    <Text style={styles.sectionTitle}>{number.toString().padStart(2, '0')}  {topicLabels[activity.topic]}</Text>
    {activity.kind === 'recognition' && <>
      <Text style={styles.hint}>{hints.recognition}</Text>
      <View style={{ marginTop: 4 }}>{activity.rows.map((row, index) => <View key={row.target} style={styles.row}>
        <Text style={styles.index}>{index + 1}.</Text><Text style={styles.target}>{row.target}</Text>
        {row.choices.map((choice) => <Text key={choice} style={styles.choice}>{choice}</Text>)}
      </View>)}</View>
    </>}
    {activity.kind === 'tones' && <>
      <Text style={styles.hint}>{activity.rows[0].requestedTone === null ? hints.tones : '先读一遍四声，再按每行提示圈出一个音节。'}</Text>
      <View style={{ flexDirection: 'row', marginLeft: 110, marginTop: 6 }}>{toneNames.map((name, index) => <View key={name} style={{ width: 78, alignItems: 'center' }}><ToneLine tone={index} /><Text style={{ fontSize: 8 }}>{name}</Text></View>)}</View>
      {activity.rows.map((row, index) => <View key={row.syllables[0]} style={[styles.row, { height: 35 }]}>
        <Text style={styles.index}>{index + 1}.</Text><Text style={{ width: 85, fontSize: 9 }}>{row.requestedTone === null ? '一起读' : `圈出${toneNames[row.requestedTone - 1]}`}</Text>
        {row.syllables.map((syllable) => <Text key={syllable} style={styles.choice}>{syllable}</Text>)}
      </View>)}
    </>}
    {activity.kind === 'matching' && <>
      <Text style={styles.hint}>{activity.topic === 'recognition' ? '读一读，把左右相同的拼音朋友连起来。' : activity.example ? '先和家人读示范，再把左边的拼读和右边的音节连起来。' : '读一读左边的拼音，再连到右边的图画。'}</Text>
      {activity.example && <View style={styles.example}><Text style={styles.exampleLabel}>一起试试</Text><Text style={styles.smallPinyin}>{activity.example}</Text></View>}
      <View style={{ marginTop: activity.example ? 0 : 6 }}>{activity.left.map((left, index) => {
        const right = activity.right[index];
        return <View key={left.id} style={styles.matchRow}>
          <View style={styles.matchLeft}><Text style={styles.index}>{index + 1}.</Text><Text style={styles.pinyin}>{left.text}</Text></View>
          <View style={styles.matchSpace}><View style={styles.dot} /><View style={styles.dot} /></View>
          <View style={styles.matchRight}>{right.picture ? <Picture id={right.picture} size={35} /> : <Text style={styles.pinyin}>{right.text}</Text>}<Text style={styles.rightLabel}>{String.fromCharCode(65 + index)}</Text></View>
        </View>;
      })}</View>
    </>}
    {activity.kind === 'writing' && <>
      <Text style={styles.hint}>{hints.writing}</Text>
      <View style={styles.writeLabels}>{['看范字', '轻轻描', '自己写', '再写一次'].map((label) => <Text style={styles.writeLabel} key={label}>{label}</Text>)}</View>
      {activity.models.map((model) => <WritingGrid key={model} model={model} />)}
    </>}
    {activity.kind === 'word_spelling' && <>
      <Text style={{ marginTop: 3, fontSize: 8.5, color: '#555', lineHeight: 1.2 }}>读左边的词语，在右边四线格写拼音。家人可以帮忙读词语。</Text>
      <Text style={{ fontSize: 7.5, lineHeight: 1.2, color: '#666', marginTop: 2 }}>词库轮换：{activity.words[0].cycle === activity.words.at(-1)!.cycle ? `第 ${activity.words[0].cycle} 轮` : `第 ${activity.words[0].cycle} 至 ${activity.words.at(-1)!.cycle} 轮`} · 本页 {activity.words.length} 个词</Text>
      <View style={{ marginTop: 3 }}>{activity.words.map((word) => <View key={`${word.cycle}-${word.text}`} style={{ flexDirection: 'row', alignItems: 'center', height: WORD_ROW_HEIGHT }}>
        <Text style={{ width: 105, fontSize: 17 }}>{word.text}</Text>
        <Svg width={395} height={38} viewBox="0 0 395 38">
          {[4, 14, 24, 34].map((y, index) => <Line key={y} x1={0} x2={395} y1={y} y2={y} stroke={index === 2 ? '#777' : '#aaa'} strokeWidth={index === 2 ? 0.8 : 0.5} />)}
        </Svg>
      </View>)}</View>
    </>}
  </View>;
}

export function PinyinPdfDocument({ worksheet }: { worksheet: PinyinWorksheet }) {
  const title = '拼音小练习';
  return <Document title={`${title}-${levelLabels[worksheet.level]}-${worksheet.seed}`} author="Home Assistant" language="zh-CN">
    {worksheet.pages.map((activities, pageIndex) => <Page key={pageIndex} size="A4" style={styles.page} wrap={false}>
      <View style={styles.frame} />
      <View style={styles.header}><Text style={styles.title}>{title}</Text><Text style={styles.meta}>{levelLabels[worksheet.level]} · 批次 {worksheet.seed}</Text><Text style={styles.headerNote}>读一读，玩一玩，慢慢来</Text></View>
      <View style={styles.content}>{activities.map((activity, index) => <Activity key={`${activity.topic}-${index}`} activity={activity} number={worksheet.pages.slice(0, pageIndex).reduce((count, page) => count + page.length, 0) + index + 1} />)}</View>
      <View style={styles.footer}><Text>Home Assistant · 黑白省墨 · 可由家人读提示</Text><Text>第 {pageIndex + 1} / {worksheet.pageCount} 页</Text></View>
    </Page>)}
  </Document>;
}
