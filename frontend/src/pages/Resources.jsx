import { useState } from 'react';
import { api, downloadFile, qs } from '../api';
import { useAuth } from '../auth';
import { formatDate, useLoad, useSubmit } from '../hooks';
import { Empty, ErrorNote, Field, Loading, PageHeader } from '../ui';

const KINDS = ['Notes', 'Past paper', 'Slides', 'Book', 'Other'];

const formatSize = (bytes) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

export default function Resources() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ q: '', course: '', kind: '' });
  const [showForm, setShowForm] = useState(false);
  const { data, error, loading, reload } = useLoad(() => api.get(`/resources${qs(filters)}`), [filters]);

  const upload = useSubmit(async (form) => {
    await api.post('/resources', new FormData(form));
    form.reset();
    setShowForm(false);
    reload();
  });
  const remove = useSubmit(async (id) => {
    await api.del(`/resources/${id}`);
    reload();
  });
  const download = useSubmit((r) => downloadFile(`/resources/${r._id}/file`, r.file.originalName));

  return (
    <>
      <PageHeader title="Course resources" subtitle="Notes, past papers and slides shared by students, searchable by course code.">
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : 'Share a resource'}
        </button>
      </PageHeader>

      {showForm && (
        <section className="card">
          <h2>Share a resource</h2>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              upload.run(e.currentTarget);
            }}
          >
            <Field label="Title"><input name="title" required maxLength={150} placeholder="CSE220 midterm notes" /></Field>
            <Field label="Course code"><input name="courseCode" required maxLength={20} placeholder="CSE220" /></Field>
            <Field label="Type">
              <select name="kind" defaultValue="Notes">{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
            </Field>
            <Field label="File" hint="PDF, Word, PowerPoint, text or images, up to 10 MB. PDFs and text files also feed the AI assistant.">
              <input name="file" type="file" accept=".pdf,.txt,.md,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg" />
            </Field>
            <Field label="…or a link" hint="Google Drive, YouTube, and so on">
              <input name="link" type="url" placeholder="https://" />
            </Field>
            <Field label="Description"><textarea name="description" rows={2} maxLength={1000} /></Field>
            <div className="form-actions"><button className="btn btn-primary" disabled={upload.busy}>{upload.busy ? 'Uploading…' : 'Share'}</button></div>
          </form>
          <ErrorNote error={upload.error} />
        </section>
      )}

      <form className="filters" onSubmit={(e) => e.preventDefault()}>
        <input
          type="search"
          placeholder="Search titles and descriptions"
          aria-label="Search resources"
          defaultValue={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
        <input
          placeholder="Course code"
          aria-label="Filter by course code"
          defaultValue={filters.course}
          onChange={(e) => setFilters((f) => ({ ...f, course: e.target.value }))}
        />
        <select aria-label="Filter by type" value={filters.kind} onChange={(e) => setFilters((f) => ({ ...f, kind: e.target.value }))}>
          <option value="">All types</option>
          {KINDS.map((k) => <option key={k}>{k}</option>)}
        </select>
      </form>

      <ErrorNote error={error || remove.error || download.error} />
      {loading && !data ? <Loading /> : !data?.resources.length ? (
        <Empty>Nothing found. Be the first to share something for this course.</Empty>
      ) : (
        <div className="grid grid-3">
          {data.resources.map((r) => (
            <article key={r._id} className="card resource">
              <div className="resource-top">
                <span className="pill">{r.courseCode}</span>
                <span className="pill pill-soft">{r.kind}</span>
              </div>
              <h3>{r.title}</h3>
              {r.description && <p className="muted small">{r.description}</p>}
              <p className="muted small">
                By {r.uploader?.name || 'a student'} · {formatDate(r.createdAt)}
                {r.indexedChunks > 2 && ' · ✨ searchable by AI'}
              </p>
              <div className="row">
                {r.file?.originalName && (
                  <button type="button" className="btn btn-small" onClick={() => download.run(r)}>
                    ⬇ {r.file.originalName.length > 24 ? 'Download' : r.file.originalName} ({formatSize(r.file.size)})
                  </button>
                )}
                {r.link && (
                  <a className="btn btn-small" href={r.link} target="_blank" rel="noopener noreferrer">Open link ↗</a>
                )}
                {r.uploader?._id === user._id && (
                  <button type="button" className="link-btn small" onClick={() => remove.run(r._id)} aria-label={`Delete ${r.title}`}>Delete</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
