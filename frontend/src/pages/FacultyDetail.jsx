import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { formatDate, formValues, useLoad, useSubmit } from '../hooks';
import { Empty, ErrorNote, Field, Loading, PageHeader, Stars } from '../ui';

export default function FacultyDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useLoad(() => api.get(`/faculty/${id}`), [id]);
  const summary = useLoad(() => api.get(`/faculty/${id}/summary`), [id, data?.faculty.reviewCount]);

  const save = useSubmit(async (form) => {
    const v = formValues(form);
    await api.post(`/faculty/${id}/reviews`, {
      ...v,
      rating: Number(v.rating),
      difficulty: Number(v.difficulty),
      anonymous: v.anonymous === 'on',
    });
    reload();
    summary.reload();
  });
  const remove = useSubmit(async () => {
    await api.del(`/faculty/${id}/reviews/mine`);
    reload();
    summary.reload();
  });

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorNote error={error} />;
  const { faculty, reviews, aiEnabled } = data;
  const mine = reviews.find((r) => r.mine);

  return (
    <>
      <p><Link to="/faculty">← All teachers</Link></p>
      <PageHeader
        title={`${faculty.name}${faculty.initials ? ` (${faculty.initials})` : ''}`}
        subtitle={`${faculty.department}${faculty.courses.length ? ` · ${faculty.courses.join(', ')}` : ''}`}
      />

      <div className="grid grid-2">
        <section className="card stat-card">
          <h2>Rating</h2>
          <p className="stat">{faculty.reviewCount ? faculty.ratingAverage.toFixed(1) : '—'}</p>
          <Stars value={faculty.ratingAverage} />
          <p className="muted">{faculty.reviewCount} review{faculty.reviewCount === 1 ? '' : 's'}</p>
        </section>

        <section className="card">
          <h2>{summary.data?.summary?.source === 'ai' ? '✨ AI summary' : 'Summary'}</h2>
          {summary.loading && !summary.data ? (
            <Loading />
          ) : summary.data?.summary ? (
            <p className="prewrap">{summary.data.summary.text}</p>
          ) : (
            <Empty>No reviews to summarise yet.</Empty>
          )}
          <ErrorNote error={summary.error} />
          {!aiEnabled && summary.data?.summary && (
            <p className="muted small">AI summaries turn on when the server has an Anthropic API key.</p>
          )}
        </section>
      </div>

      <section className="card">
        <h2>{mine ? 'Edit your review' : 'Write a review'}</h2>
        <form
          key={mine?._id || 'new'}
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            save.run(e.currentTarget);
          }}
        >
          <Field label="Rating">
            <select name="rating" defaultValue={mine?.rating || 5}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}
            </select>
          </Field>
          <Field label="Difficulty">
            <select name="difficulty" defaultValue={mine?.difficulty || 3}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} {n === 1 ? '(easy)' : n === 5 ? '(very hard)' : ''}</option>)}
            </select>
          </Field>
          <Field label="Course taken"><input name="courseCode" defaultValue={mine?.courseCode || ''} placeholder="CSE220" /></Field>
          <Field label="Your review" hint="Be specific and respectful: teaching style, grading, workload.">
            <textarea name="comment" rows={3} required minLength={10} maxLength={1500} defaultValue={mine?.comment || ''} />
          </Field>
          <label className="check">
            <input type="checkbox" name="anonymous" defaultChecked={mine ? mine.anonymous : true} /> Post anonymously
          </label>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={save.busy}>{mine ? 'Update review' : 'Post review'}</button>
            {mine && <button type="button" className="btn btn-ghost" onClick={() => remove.run()}>Delete my review</button>}
          </div>
        </form>
        <ErrorNote error={save.error || remove.error} />
      </section>

      <section className="card">
        <h2>Reviews</h2>
        {reviews.length === 0 ? <Empty>No reviews yet. Be the first.</Empty> : (
          <ul className="reviews">
            {reviews.map((r) => (
              <li key={r._id} className="review">
                <div className="review-head">
                  <Stars value={r.rating} />
                  <span className="muted small">
                    Difficulty {r.difficulty}/5{r.courseCode && ` · ${r.courseCode}`} · {formatDate(r.updatedAt)} ·{' '}
                    {r.mine ? 'You' : r.author ? r.author.name : 'Anonymous'}
                  </span>
                </div>
                <p>{r.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
