import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { AppHeader } from '../components/AppHeader';
import { downloadPinyinBatch } from '../features/pinyin-printables/download';
import { WordProgressError } from '../features/pinyin-printables/progress';
import { commonWords } from '../features/pinyin-printables/words';
import { MAX_PINYIN_PAGES, minimumPinyinPages } from '../features/pinyin-printables/generator';
import { levelLabels, pinyinTopics, topicDescriptions, topicLabels } from '../features/pinyin-printables/types';
import type { PinyinBatch, PinyinLevel, PinyinTopic } from '../features/pinyin-printables/types';

export function PinyinPrintablePage() {
  const { user } = useAuth();
  const [level, setLevel] = useState<PinyinLevel>('beginner');
  const [topics, setTopics] = useState<PinyinTopic[]>([...pinyinTopics]);
  const [pageCount, setPageCount] = useState(2);
  const [batch, setBatch] = useState<PinyinBatch | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const generationLock = useRef(false);
  const minimumPages = minimumPinyinPages(topics.length);
  const busy = generating;
  if (!user) return null;

  const invalidate = () => { setBatch(null); setError(''); };
  const toggleTopic = (topic: PinyinTopic) => {
    const next = topics.includes(topic) ? topics.filter((value) => value !== topic) : pinyinTopics.filter((value) => topics.includes(value) || value === topic);
    setTopics(next);
    setPageCount((current) => Math.max(current, minimumPinyinPages(next.length)));
    invalidate();
  };
  const generate = async (existing?: PinyinBatch) => {
    if (!topics.length || generationLock.current) return;
    generationLock.current = true;
    setGenerating(true);
    setError('');
    try {
      const target = await downloadPinyinBatch(user.id, { level, topics: [...topics], pageCount }, existing);
      setBatch(target);
    } catch (generationError) {
      console.error(generationError);
      setError(generationError instanceof WordProgressError ? generationError.message : 'PDF 生成失败，请检查网络与浏览器下载设置后重试。你的练习设置已保留，词语进度未推进。');
    } finally {
      generationLock.current = false;
      setGenerating(false);
    }
  };

  return <main className="app-shell">
    <AppHeader user={user} />
    <section className="math-page-main pinyin-page-main">
      <nav className="breadcrumbs" aria-label="面包屑"><Link to="/">首页</Link><span aria-hidden="true">/</span><Link to="/modules/printer">打印机</Link><span aria-hidden="true">/</span><span>拼音</span></nav>
      <header className="math-page-heading"><p className="eyebrow">KINDERGARTEN PINYIN</p><h1>拼音练习打印</h1><p>读一读，连一连，再轻轻写几笔。和孩子一起慢慢练，生成适合 A4 纸打印的黑白 PDF。</p></header>
      <div className="math-config-layout">
        <section className="math-config-card" aria-labelledby="pinyin-topic-heading">
          <fieldset className="pinyin-level-picker" disabled={busy}><legend>选择练习阶段</legend><div className="pinyin-level-options">
            {(['beginner', 'blending'] as const).map((value) => <label className={`pinyin-level-option${value === level ? ' selected' : ''}`} key={value}>
              <input type="radio" name="pinyin-level" value={value} checked={level === value} onChange={() => { setLevel(value); invalidate(); }} />
              <span><strong>{levelLabels[value]}</strong><small>{value === 'beginner' ? '字母、四声和简单拼读' : '韵母、常见音节和生活词语'}</small></span>
            </label>)}
          </div></fieldset>
          <div className="config-section-heading"><div><span>01</span><h2 id="pinyin-topic-heading">选择栏目</h2></div><small>可多选，默认全选</small></div>
          <div className="topic-selector-grid">{pinyinTopics.map((topic, index) => <label key={topic} className={`topic-option pinyin-topic-option${topics.includes(topic) ? ' selected' : ''}`}>
            <input type="checkbox" checked={topics.includes(topic)} onChange={() => toggleTopic(topic)} disabled={busy} />
            <span className="topic-check" aria-hidden="true">{topics.includes(topic) ? '✓' : ''}</span><span className="topic-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="topic-copy"><strong>{topicLabels[topic]}</strong><small>{topicDescriptions[level][topic].description}</small><span className="pinyin-example">{topicDescriptions[level][topic].example}</span></span>
          </label>)}</div>
          {topics.length === 0 && <div className="selection-warning" role="alert">请至少选择一个栏目</div>}
          <p className="pinyin-parent-note">每次选一两个小活动也很好。家人可以帮忙读提示，认读和连线不要求孩子先认识汉字，词语拼写也可以先听家人读。</p>
        </section>
        <aside className="math-output-card">
          <div className="config-section-heading"><div><span>02</span><h2>输出设置</h2></div></div>
          <label className="page-count-field" htmlFor="pinyin-page-count"><span>练习总页数</span><select id="pinyin-page-count" value={pageCount} disabled={busy || topics.length === 0} onChange={(event) => { setPageCount(Number(event.target.value)); invalidate(); }}>
            {Array.from({ length: MAX_PINYIN_PAGES - minimumPages + 1 }, (_, index) => minimumPages + index).map((page) => <option key={page} value={page}>{page} 页</option>)}
          </select></label>
          <div className="output-summary"><div><span>纸张</span><strong>A4 纵向 · 黑白省墨</strong></div><div><span>活动空间</span><strong>每页三个活动区</strong></div><div><span>书写</span><strong>四线三格 · 少量练习</strong></div><div><span>剩余空间</span><strong>优先安排词语拼写</strong></div></div>
          <p className="local-generation-note"><span aria-hidden="true">◇</span>练习在当前浏览器中生成，无需上传孩子的信息。首次生成需加载字体。</p>
          {topics.includes('word_spelling') && <p className="pinyin-cycle-note">常用词库共 <strong>{commonWords.length}</strong> 个词，两档共用一个进度，依次轮换，学完一轮再复习。进度保存在当前账号、当前浏览器；生成新一份并发起下载后推进，重新下载不推进。清除网站数据或更换浏览器会从头开始。</p>}
          {error && <div className="form-alert" role="alert">{error}</div>}
          <button type="button" className="generate-pdf-button" disabled={busy || !topics.length} onClick={() => void generate()}>
            {generating ? <><span className="button-spinner" />正在生成 PDF…</> : <>生成拼音练习 <span aria-hidden="true">→</span></>}
          </button>
        </aside>
      </div>
      {batch && <section className="batch-card" aria-live="polite"><div><p className="collection-kicker">当前批次</p><h2>{batch.seed}</h2><p>{levelLabels[batch.level]} · {batch.topics.length} 个栏目 · {batch.pageCount} 页</p>{batch.words.length > 0 && <p>本批 {batch.words.length} 个常用词 · 第 {batch.words[0].cycle} 轮第 {batch.words[0].position} 个至第 {batch.words.at(-1)!.cycle} 轮第 {batch.words.at(-1)!.position} 个</p>}</div><div className="batch-actions">
        <button type="button" disabled={busy} onClick={() => void generate(batch)}>重新下载</button>
        <button type="button" className="primary" disabled={busy} onClick={() => void generate()}>换一套</button>
      </div></section>}
    </section>
    <footer className="app-footer">Home Assistant · 内容仅在你的浏览器中生成</footer>
  </main>;
}
