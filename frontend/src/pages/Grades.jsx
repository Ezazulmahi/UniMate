import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatDateTime, formValues, relativeTime, useLoad, useSubmit } from '../hooks';
import { Empty, ErrorNote, Field, Loading, PageHeader } from '../ui';

const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];

function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function Countdown({ date, now }) {
  const ms = new Date(date).getTime() - now;
  if (ms <= 0) return <span className="pill">done</span>;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const urgent = days < 3;
  return (
    <span className={`countdown ${urgent ? 'countdown-urgent' : ''}`}>
      {days > 0 && <><strong>{days}</strong>d </>}
      <strong>{hours}</strong>h <strong>{mins}</strong>m
    </span>
  );
}

export default function Grades() {
  const grades = useLoad(() => api.get('/academic/grades'));
  const exams = useLoad(() => api.get('/academic/exams'));
  const now = useNow();
  const [planned, setPlanned] = useState([]);

  const addGrade = useSubmit(async (form) => {
    await api.post('/academic/grades', formValues(form));
    form.reset();
    grades.reload();
  });
  const delGrade = useSubmit(async (id) => {
    await api.del(`/academic/grades/${id}`);
    grades.reload();
  });
  const addExam = useSubmit(async (form) => {
    const v = formValues(form);
    await api.post('/academic/exams', { ...v, date: new Date(v.date).toISOString() });
    form.reset();
    exams.reload();
  });
  const delExam = useSubmit(async (id) => {
    await api.del(`/academic/exams/${id}`);
    exams.reload();
  });

  // "What if" preview: current grades plus planned courses.
  const preview = useLoad(
    () =>
      planned.length
        ? api.post('/academic/cgpa/preview', { grades: [...(grades.data?.grades || []), ...planned] })
        : Promise.resolve(null),
    [planned, grades.data]
  );

  const g = grades.data;
  const upcoming = (exams.data?.exams || []).filter((x) => new Date(x.date).getTime() > now);
  const past = (exams.data?.exams || []).filter((x) => new Date(x.date).getTime() <= now);

  return (
    <>
      <PageHeader title="CGPA & exams" subtitle="Track your results and count down to your next exam." />

      <div className="grid grid-2">
        <section className="card stat-card">
          <h2>Your CGPA</h2>
          <p className="stat">{g?.cgpa ?? '—'}</p>
          <p className="muted">{g ? `${g.totalCredits} credits` : ''}</p>
          {g?.semesters?.length > 0 && (
            <table className="table">
              <thead>
                <tr><th>Semester</th><th>Credits</th><th>GPA</th></tr>
              </thead>
              <tbody>
                {g.semesters.map((s) => (
                  <tr key={s.semester}><td>{s.semester}</td><td>{s.credits}</td><td>{s.gpa.toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2>Add a result</h2>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              addGrade.run(e.currentTarget);
            }}
          >
            <Field label="Course code"><input name="courseCode" required placeholder="CSE110" /></Field>
            <Field label="Credits"><input name="credits" type="number" min="0.5" max="6" step="0.5" defaultValue="3" required /></Field>
            <Field label="Grade">
              <select name="grade" defaultValue="A">{GRADES.map((x) => <option key={x}>{x}</option>)}</select>
            </Field>
            <Field label="Semester"><input name="semester" required placeholder="Spring 2026" /></Field>
            <div className="form-actions"><button className="btn btn-primary" disabled={addGrade.busy}>Add result</button></div>
          </form>
          <ErrorNote error={addGrade.error || delGrade.error} />
        </section>
      </div>

      <section className="card">
        <h2>Results</h2>
        <ErrorNote error={grades.error} />
        {grades.loading && !g ? <Loading /> : !g?.grades.length ? (
          <Empty>No results yet.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Course</th><th>Semester</th><th>Credits</th><th>Grade</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {g.grades.map((r) => (
                <tr key={r._id}>
                  <td>{r.courseCode}</td><td>{r.semester}</td><td>{r.credits}</td><td>{r.grade}</td>
                  <td><button type="button" className="link-btn" onClick={() => delGrade.run(r._id)} aria-label={`Delete ${r.courseCode} result`}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>What-if calculator</h2>
        <p className="muted">Add courses you're planning to take and the grade you expect, to see your new CGPA. Nothing here is saved.</p>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const v = formValues(e.currentTarget);
            setPlanned((p) => [...p, { courseCode: v.courseCode || `Course ${p.length + 1}`, credits: Number(v.credits), grade: v.grade, semester: 'Planned' }]);
            e.currentTarget.reset();
          }}
        >
          <Field label="Course"><input name="courseCode" placeholder="CSE221" /></Field>
          <Field label="Credits"><input name="credits" type="number" min="0.5" max="6" step="0.5" defaultValue="3" required /></Field>
          <Field label="Expected grade">
            <select name="grade" defaultValue="A">{GRADES.map((x) => <option key={x}>{x}</option>)}</select>
          </Field>
          <div className="form-actions">
            <button className="btn">Add planned course</button>
            {planned.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => setPlanned([])}>Clear</button>}
          </div>
        </form>
        {planned.length > 0 && (
          <p>
            {planned.map((p) => `${p.courseCode} (${p.grade}, ${p.credits} cr)`).join(', ')} → projected CGPA{' '}
            <strong className="stat-inline">{preview.data?.cgpa ?? '…'}</strong>
          </p>
        )}
      </section>

      <section className="card">
        <h2>Exam countdown</h2>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            addExam.run(e.currentTarget);
          }}
        >
          <Field label="Course code"><input name="courseCode" required placeholder="MAT216" /></Field>
          <Field label="Exam"><input name="title" placeholder="Midterm" defaultValue="Midterm" /></Field>
          <Field label="Date & time"><input name="date" type="datetime-local" required /></Field>
          <Field label="Room"><input name="location" placeholder="Optional" /></Field>
          <div className="form-actions"><button className="btn btn-primary" disabled={addExam.busy}>Add exam</button></div>
        </form>
        <ErrorNote error={addExam.error || delExam.error || exams.error} />
        {exams.loading && !exams.data ? <Loading /> : upcoming.length === 0 ? (
          <Empty>No upcoming exams. Good time to relax, or add one above.</Empty>
        ) : (
          <ul className="exam-list">
            {upcoming.map((x) => (
              <li key={x._id} className="exam">
                <div>
                  <strong>{x.courseCode}</strong> {x.title}
                  <div className="muted small">{formatDateTime(x.date)}{x.location && ` · ${x.location}`}</div>
                </div>
                <Countdown date={x.date} now={now} />
                <button type="button" className="link-btn small" onClick={() => delExam.run(x._id)} aria-label={`Delete ${x.courseCode} ${x.title}`}>Delete</button>
              </li>
            ))}
          </ul>
        )}
        {past.length > 0 && (
          <details>
            <summary className="muted">Past exams ({past.length})</summary>
            <ul className="list">
              {past.map((x) => (
                <li key={x._id}>
                  {x.courseCode} {x.title} <span className="muted">· {relativeTime(x.date, now)}</span>{' '}
                  <button type="button" className="link-btn small" onClick={() => delExam.run(x._id)} aria-label={`Delete ${x.courseCode} ${x.title}`}>Delete</button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </>
  );
}
