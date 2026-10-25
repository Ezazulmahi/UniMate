import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, qs } from '../api';
import { useAuth } from '../auth';
import { formatDate, formValues, useLoad, useSubmit } from '../hooks';
import { Empty, ErrorNote, Field, Loading, PageHeader } from '../ui';

function TutorProfileForm({ onSaved }) {
  const { data, loading } = useLoad(() => api.get('/tutoring/tutors/me'));
  const save = useSubmit(async (form) => {
    const v = formValues(form);
    await api.put('/tutoring/tutors/me', { ...v, rate: Number(v.rate), active: v.active === 'on' });
    onSaved();
  });
  if (loading) return <Loading />;
  const t = data?.tutor;
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        save.run(e.currentTarget);
      }}
    >
      <Field label="Courses you can teach" hint="Comma separated"><input name="courses" required defaultValue={t?.courses.join(', ') || ''} placeholder="CSE110, MAT110" /></Field>
      <Field label="Rate (৳ per hour)" hint="0 for free peer help"><input name="rate" type="number" min="0" defaultValue={t?.rate ?? 0} /></Field>
      <Field label="Mode">
        <select name="mode" defaultValue={t?.mode || 'Both'}>{['Online', 'In person', 'Both'].map((m) => <option key={m}>{m}</option>)}</select>
      </Field>
      <Field label="When are you free?"><input name="availability" defaultValue={t?.availability || ''} placeholder="Weekday evenings" maxLength={200} /></Field>
      <Field label="About you"><textarea name="about" rows={2} defaultValue={t?.about || ''} maxLength={1000} /></Field>
      <label className="check"><input type="checkbox" name="active" defaultChecked={t ? t.active : true} /> Show me in the tutor list</label>
      <div className="form-actions"><button className="btn btn-primary" disabled={save.busy}>{t ? 'Update profile' : 'Become a tutor'}</button></div>
      <ErrorNote error={save.error} />
    </form>
  );
}

export default function Tutoring() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('requests');
  const [course, setCourse] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const requests = useLoad(() => api.get(`/tutoring/requests${qs({ course })}`), [course]);
  const tutors = useLoad(() => api.get(`/tutoring/tutors${qs({ course, free: freeOnly })}`), [course, freeOnly]);

  const post = useSubmit(async (form) => {
    await api.post('/tutoring/requests', formValues(form));
    form.reset();
    setShowForm(false);
    requests.reload();
  });
  const resolve = useSubmit(async (id) => {
    await api.patch(`/tutoring/requests/${id}`, { status: 'resolved' });
    requests.reload();
  });
  const chat = useSubmit(async (userId, topic) => {
    const res = await api.post('/chat', { userId, topic });
    navigate(`/messages/${res.conversation._id}`);
  });

  return (
    <>
      <PageHeader title="Study help & tutoring" subtitle="Ask for help with a course, or find a peer tutor." />

      <div className="tabs" role="tablist">
        {[
          ['requests', 'Help requests'],
          ['tutors', 'Find a tutor'],
          ['teach', 'Offer tutoring'],
        ].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`tab ${tab === key ? 'tab-active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab !== 'teach' && (
        <div className="filters">
          <input placeholder="Filter by course code" aria-label="Filter by course code" onChange={(e) => setCourse(e.target.value)} />
          {tab === 'tutors' && (
            <label className="check"><input type="checkbox" onChange={(e) => setFreeOnly(e.target.checked)} /> Free only</label>
          )}
          {tab === 'requests' && (
            <button type="button" className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : 'Ask for help'}</button>
          )}
        </div>
      )}
      <ErrorNote error={chat.error || resolve.error} />

      {tab === 'requests' && (
        <>
          {showForm && (
            <section className="card">
              <form
                className="form-grid"
                onSubmit={(e) => {
                  e.preventDefault();
                  post.run(e.currentTarget);
                }}
              >
                <Field label="Course code"><input name="courseCode" required placeholder="MAT216" /></Field>
                <Field label="What do you need help with?"><input name="title" required maxLength={150} placeholder="Eigenvalues before Thursday's quiz" /></Field>
                <Field label="Details"><textarea name="details" rows={3} maxLength={2000} /></Field>
                <div className="form-actions"><button className="btn btn-primary" disabled={post.busy}>Post request</button></div>
              </form>
              <ErrorNote error={post.error} />
            </section>
          )}
          <ErrorNote error={requests.error} />
          {requests.loading && !requests.data ? <Loading /> : !requests.data?.requests.length ? (
            <Empty>No open requests{course && ` for ${course.toUpperCase()}`}.</Empty>
          ) : (
            <ul className="stack">
              {requests.data.requests.map((r) => {
                const mine = r.author?._id === user._id;
                return (
                  <li key={r._id} className="card">
                    <div className="card-head">
                      <h3><span className="pill">{r.courseCode}</span> {r.title}</h3>
                      <span className="muted small">{mine ? 'You' : r.author?.name} · {formatDate(r.createdAt)}</span>
                    </div>
                    {r.details && <p>{r.details}</p>}
                    <div className="row">
                      {mine ? (
                        <button type="button" className="btn btn-small" onClick={() => resolve.run(r._id)}>Mark solved</button>
                      ) : (
                        <button type="button" className="btn btn-primary btn-small" onClick={() => chat.run(r.author._id, `${r.courseCode}: ${r.title}`)}>I can help</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {tab === 'tutors' && (
        <>
          <ErrorNote error={tutors.error} />
          {tutors.loading && !tutors.data ? <Loading /> : !tutors.data?.tutors.length ? (
            <Empty>No tutors yet{course && ` for ${course.toUpperCase()}`}. You could be the first one under "Offer tutoring".</Empty>
          ) : (
            <div className="grid grid-3">
              {tutors.data.tutors.map((t) => (
                <article key={t._id} className="card">
                  <h3>{t.user?.name}</h3>
                  <p className="muted small">{t.user?.department}</p>
                  <p>{t.courses.map((c) => <span key={c} className="pill">{c}</span>)}</p>
                  <p className="small"><strong>{t.rate ? `৳${t.rate}/hour` : 'Free'}</strong> · {t.mode}{t.availability && ` · ${t.availability}`}</p>
                  {t.about && <p className="muted small">{t.about}</p>}
                  {t.user?._id !== user._id && (
                    <button type="button" className="btn btn-primary btn-small" onClick={() => chat.run(t.user._id, `Tutoring: ${t.courses.join(', ')}`)}>Message</button>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'teach' && (
        <section className="card">
          <h2>Your tutor profile</h2>
          <TutorProfileForm onSaved={() => { tutors.reload(); setTab('tutors'); }} />
        </section>
      )}
    </>
  );
}
