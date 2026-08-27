import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { AppHeader } from '../components/AppHeader';
import { createMathWorksheet } from '../features/math-printables/generator';
import { MAXIMUM_PAGE_COUNT, minimumPageCount } from '../features/math-printables/layout';
import { createBatchSeed } from '../features/math-printables/random';
import { mathTopicDescriptions, mathTopicLabels, mathTopics } from '../features/math-printables/types';
import type { DocumentType, MathTopic } from '../features/math-printables/types';

type Batch = { seed: string; topics: MathTopic[]; pageCount: number };

export function MathPrintablePage() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<MathTopic[]>([...mathTopics]);
  const [pageCount, setPageCount] = useState(2);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [generating, setGenerating] = useState<DocumentType | null>(null);
  const [error, setError] = useState('');
  const minimumPages = minimumPageCount(topics.length);
  const pageOptions = useMemo(
    () => Array.from({ length: MAXIMUM_PAGE_COUNT - minimumPages + 1 }, (_, index) => minimumPages + index),
    [minimumPages],
  );

  if (!user) return null;

  const invalidateBatch = () => {
    setBatch(null);
    setError('');
  };

  const toggleTopic = (topic: MathTopic) => {
    const next = topics.includes(topic) ? topics.filter((item) => item !== topic) : [...topics, topic];
    const ordered = mathTopics.filter((item) => next.includes(item));
    setTopics(ordered);
    setPageCount((current) => Math.max(current, minimumPageCount(ordered.length)));
    invalidateBatch();
  };

  const changePageCount = (value: number) => {
    setPageCount(Math.max(minimumPages, Math.min(MAXIMUM_PAGE_COUNT, value)));
    invalidateBatch();
  };

  const generateAndDownload = async (documentType: DocumentType, requestedBatch?: Batch) => {
    if (topics.length === 0 || generating) return;
    const targetBatch = requestedBatch ?? { seed: createBatchSeed(), topics: [...topics], pageCount };
    setGenerating(documentType);
    setError('');
    try {
      const worksheet = createMathWorksheet(targetBatch.seed, targetBatch.topics, targetBatch.pageCount);
      const { downloadBlob, renderMathPdf } = await import('../features/math-printables/render');
      const blob = await renderMathPdf(worksheet, documentType);
      const label = documentType === 'worksheet' ? '练习卷' : '答案';
      downloadBlob(blob, `幼儿园数学-${label}-${targetBatch.seed}.pdf`);
      if (documentType === 'worksheet') setBatch(targetBatch);
    } catch (generationError) {
      console.error(generationError);
      setError('PDF 生成失败，请检查浏览器存储空间后重试');
    } finally {
      setGenerating(null);
    }
  };

  const busy = generating !== null;

  return (
    <main className="app-shell">
      <AppHeader user={user} />
      <section className="math-page-main">
        <nav className="breadcrumbs" aria-label="面包屑">
          <Link to="/">首页</Link><span aria-hidden="true">/</span><Link to="/modules/printer">打印机</Link><span aria-hidden="true">/</span><span>数学</span>
        </nav>
        <header className="math-page-heading">
          <p className="eyebrow">KINDERGARTEN MATH</p>
          <h1>数学练习打印</h1>
          <p>选择练习栏目与总页数，内容会在浏览器中随机生成并下载为黑白 A4 PDF。</p>
        </header>

        <div className="math-config-layout">
          <section className="math-config-card" aria-labelledby="topic-heading">
            <div className="config-section-heading"><div><span>01</span><h2 id="topic-heading">选择栏目</h2></div><small>可多选，默认全选</small></div>
            <div className="topic-selector-grid">
              {mathTopics.map((topic, index) => {
                const selected = topics.includes(topic);
                return (
                  <label className={`topic-option${selected ? ' selected' : ''}`} key={topic}>
                    <input type="checkbox" checked={selected} onChange={() => toggleTopic(topic)} disabled={busy} />
                    <span className="topic-check" aria-hidden="true">{selected ? '✓' : ''}</span>
                    <span className="topic-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="topic-copy"><strong>{mathTopicLabels[topic]}</strong><small>{mathTopicDescriptions[topic]}</small></span>
                  </label>
                );
              })}
            </div>
            {topics.length === 0 && <div className="selection-warning" role="alert">请至少选择一个栏目</div>}
          </section>

          <aside className="math-output-card">
            <div className="config-section-heading"><div><span>02</span><h2>输出设置</h2></div></div>
            <label className="page-count-field" htmlFor="page-count"><span>练习卷总页数</span><select id="page-count" value={pageCount} onChange={(event) => changePageCount(Number(event.target.value))} disabled={busy || topics.length === 0}>{pageOptions.map((page) => <option value={page} key={page}>{page} 页</option>)}</select></label>
            <div className="output-summary">
              <div><span>纸张</span><strong>A4 纵向</strong></div>
              <div><span>样式</span><strong>黑白省墨</strong></div>
              <div><span>答题空间</span><strong>每栏至少 1/3 页</strong></div>
              <div><span>答案</span><strong>单独 PDF</strong></div>
            </div>
            <p className="local-generation-note"><span aria-hidden="true">◇</span>题目和 PDF 均在当前浏览器本地生成，不会上传儿童信息。首次生成需加载中文字体。</p>
            {error && <div className="form-alert" role="alert"><span>!</span>{error}</div>}
            <button className="generate-pdf-button" type="button" disabled={busy || topics.length === 0} onClick={() => void generateAndDownload('worksheet')}>
              {generating === 'worksheet' ? <><span className="button-spinner" />正在生成 PDF…</> : <>生成练习卷 <span aria-hidden="true">→</span></>}
            </button>
          </aside>
        </div>

        {batch && (
          <section className="batch-card" aria-live="polite">
            <div><p className="collection-kicker">当前批次</p><h2>{batch.seed}</h2><p>{batch.topics.length} 个栏目 · {batch.pageCount} 页 · 练习卷与答案内容完全对应</p></div>
            <div className="batch-actions">
              <button type="button" disabled={busy} onClick={() => void generateAndDownload('worksheet', batch)}>重新下载练习卷</button>
              <button className="primary" type="button" disabled={busy} onClick={() => void generateAndDownload('answers', batch)}>{generating === 'answers' ? '正在生成答案…' : '下载答案'}</button>
              <button type="button" disabled={busy} onClick={() => void generateAndDownload('worksheet')}>换一套题</button>
            </div>
          </section>
        )}
      </section>
      <footer className="app-footer">Home Assistant · 内容仅在你的浏览器中生成</footer>
    </main>
  );
}
