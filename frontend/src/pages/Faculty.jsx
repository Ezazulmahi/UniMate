import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, qs } from '../api';
import { formValues, useLoad, useSubmit } from '../hooks';
import { Empty, ErrorNote, Field, Loading, PageHeader, Stars } from '../ui';

export default function Faculty() {
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const { data, error, loading } = useLoad(() => api.get(`/faculty${qs({ q })}`), [q]);

  const add = useSubmit(async (form) => {
    const res = await api.post('/faculty', formValues(form));
    navigate(`/faculty/${res.faculty._id}`);
  });

  return (
    <>
      <PageHeader title="Faculty reviews" subtitle="Honest reviews from students, with an AI summary of the pros and cons.">
        <button type="button" className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : 'Add a teacher'}
        </button>
      </PageHeader>

      {showForm && (
        <section className="card">
          <h2>Add a teacher</h2>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              add.run(e.currentTarget);
            }}
          >
            <Field label="Full name"><input name="name" required maxLength={100} /></Field>
            <Field label="Initials"><input name="initials" maxLength={10} placeholder="Optional" /></Field>
            <Field label="Department"><input name="department" required maxLength={80} placeholder="CSE" /></Field>
            <Field label="Courses" hint="Comma separated"><input name="courses" placeholder="CSE220, CSE221" /></Field>
            <div className="form-actions"><button className="btn btn-primary" disabled={add.busy}>Add</button></div>
          </form>
          <ErrorNote error={add.error} />
        </section>
      )}

      <div className="filters">
        <input
          type="search"
          placeholder="Search by name, initials, department or course"
          aria-label="Search teachers"
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : !data?.faculty.length ? (
        <Empty>No teachers found. Add one so students can review them.</Empty>
      ) : (
        <div className="grid grid-3">
          {data.faculty.map((f) => (
            <Link key={f._id} to={`/faculty/${f._id}`} className="card card-link">
              <h3>{f.name} {f.initials && <span className="muted">({f.initials})</span>}</h3>
              <p className="muted small">{f.department}{f.courses.length > 0 && ` · ${f.courses.join(', ')}`}</p>
              <p>
                <Stars value={f.ratingAverage} /> <strong>{f.reviewCount ? f.ratingAverage.toFixed(1) : '—'}</strong>{' '}
                <span className="muted small">({f.reviewCount} review{f.reviewCount === 1 ? '' : 's'})</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
