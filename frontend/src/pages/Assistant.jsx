import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formValues, useLoad, useSubmit } from '../hooks';
import { Empty, ErrorNote, Field, PageHeader } from '../ui';

export default function Assistant() {
  const status = useLoad(() => api.get('/assistant/status'));
  const [history, setHistory] = useState([]);

  const ask = useSubmit(async (form) => {
    const v = formValues(form);
    const res = await api.post('/assistant/ask', v);
    setHistory((h) => [{ question: v.question, courseCode: v.courseCode, ...res }, ...h]);
    form.querySelector('textarea').value = '';
  });

  return (
    <>
      <PageHeader
        title="AI study assistant"
        subtitle="Ask a question and get an answer based on the notes students have shared in Resources."
      />
      {status.data && !status.data.aiEnabled && (
        <div className="note">
          AI answers are off because the server has no Anthropic API key, so you'll see the most relevant passages from the notes instead.
        </div>
      )}

      <section className="card">
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            ask.run(e.currentTarget);
          }}
        >
          <Field label="Course code" hint="Optional: only search this course's notes">
            <input name="courseCode" placeholder="CSE220" maxLength={20} />
          </Field>
          <Field label="Your question">
            <textarea
              name="question"
              rows={3}
              required
              minLength={3}
              maxLength={1000}
              placeholder="What is the difference between a stack and a queue?"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) e.currentTarget.form.requestSubmit();
              }}
            />
          </Field>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={ask.busy}>{ask.busy ? 'Thinking…' : 'Ask'}</button>
          </div>
        </form>
        <ErrorNote error={ask.error} />
      </section>

      {history.length === 0 ? (
        <Empty>
          Answers come only from shared notes, so the more people <Link to="/resources">upload</Link>, the better it gets.
        </Empty>
      ) : (
        <ul className="stack">
          {history.map((item, i) => (
            <li key={history.length - i} className="card answer">
              <p className="question">
                <strong>Q:</strong> {item.question} {item.courseCode && <span className="pill">{item.courseCode.toUpperCase()}</span>}
              </p>
              <p className="prewrap">{item.mode === 'ai' && '✨ '}{item.answer}</p>
              {item.mode === 'search' && (
                <ol className="passages">
                  {item.passages.map((p, j) => (
                    <li key={j}>
                      <blockquote>{p.text}</blockquote>
                      <span className="muted small">From “{p.title}” ({p.courseCode})</span>
                    </li>
                  ))}
                </ol>
              )}
              {item.sources.length > 0 && (
                <p className="muted small">
                  Sources: {item.sources.map((s) => `${s.title} (${s.courseCode})`).join(' · ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
