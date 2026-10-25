import { useState } from 'react';
import { api } from '../api';
import { formValues, useLoad, useSubmit } from '../hooks';
import { Empty, ErrorNote, Field, Loading, PageHeader } from '../ui';

const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const KINDS = ['Class', 'Lab', 'Tutorial', 'Other'];

export default function Routine() {
  const { data, error, loading, reload } = useLoad(() => api.get('/routine'));
  const [warning, setWarning] = useState(null);

  const add = useSubmit(async (form) => {
    const res = await api.post('/routine', formValues(form));
    setWarning(
      res.clashesWith.length
        ? `${res.entry.courseCode} clashes with ${res.clashesWith.map((c) => `${c.courseCode} (${c.start}–${c.end})`).join(', ')}.`
        : null
    );
    form.reset();
    reload();
  });
  const remove = useSubmit(async (id) => {
    await api.del(`/routine/${id}`);
    reload();
  });

  const clashing = new Set((data?.clashes || []).flat());
  const entries = data?.entries || [];
  const activeDays = DAYS.filter((d) => entries.some((e) => e.day === d));

  return (
    <>
      <PageHeader title="Routine builder" subtitle="Add your classes and see your week. Clashes are highlighted in red." />

      <section className="card">
        <h2>Add a class</h2>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            add.run(e.currentTarget);
          }}
        >
          <Field label="Course code">
            <input name="courseCode" required placeholder="CSE220" maxLength={20} />
          </Field>
          <Field label="Type">
            <select name="kind" defaultValue="Class">
              {KINDS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Day">
            <select name="day" defaultValue="Sun">
              {DAYS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Start">
            <input name="start" type="time" required defaultValue="08:00" />
          </Field>
          <Field label="End">
            <input name="end" type="time" required defaultValue="09:20" />
          </Field>
          <Field label="Room">
            <input name="room" placeholder="UB-1201" maxLength={40} />
          </Field>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={add.busy}>Add to routine</button>
          </div>
        </form>
        <ErrorNote error={add.error} />
        {warning && <div className="note note-warn" role="status">⚠️ {warning} It was saved anyway.</div>}
      </section>

      <ErrorNote error={error || remove.error} />
      {loading && !data ? (
        <Loading />
      ) : entries.length === 0 ? (
        <Empty>Your routine is empty. Add your first class above.</Empty>
      ) : (
        <>
          {clashing.size > 0 && (
            <div className="note note-warn">⚠️ You have {data.clashes.length} clash{data.clashes.length > 1 ? 'es' : ''} in your routine.</div>
          )}
          <div className="week">
            {activeDays.map((day) => (
              <section key={day} className="day-col">
                <h3>{day}</h3>
                {entries
                  .filter((e) => e.day === day)
                  .map((e) => (
                    <article key={e._id} className={`slot ${clashing.has(e._id) ? 'slot-clash' : ''}`}>
                      <div className="slot-time">{e.start}–{e.end}</div>
                      <div className="slot-course">
                        {e.courseCode}
                        {e.kind !== 'Class' && <span className="pill">{e.kind}</span>}
                      </div>
                      {e.room && <div className="muted small">{e.room}</div>}
                      <button
                        type="button"
                        className="link-btn small"
                        onClick={() => remove.run(e._id)}
                        aria-label={`Remove ${e.courseCode} on ${day}`}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
