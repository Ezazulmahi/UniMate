import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, qs } from '../api';
import { useAuth } from '../auth';
import { formatDateTime, formValues, localDateTimeInput, useLoad, useSubmit } from '../hooks';
import { Empty, ErrorNote, Field, Loading, PageHeader } from '../ui';

const VEHICLES = ['Car', 'CNG', 'Rickshaw', 'Uber/Pathao', 'Other'];

export default function Rides() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ from: '', to: '', mine: false });
  const [showForm, setShowForm] = useState(false);
  const { data, error, loading, reload } = useLoad(() => api.get(`/rides${qs(filters)}`), [filters]);

  const create = useSubmit(async (form) => {
    const v = formValues(form);
    await api.post('/rides', {
      ...v,
      seats: Number(v.seats),
      totalFare: Number(v.totalFare),
      departAt: new Date(v.departAt).toISOString(),
    });
    form.reset();
    setShowForm(false);
    reload();
  });
  const act = useSubmit(async (id, action) => {
    await api.post(`/rides/${id}/${action}`);
    reload();
  });
  const message = useSubmit(async (ride) => {
    const res = await api.post('/chat', { userId: ride.host._id, topic: `Ride ${ride.from} → ${ride.to}` });
    navigate(`/messages/${res.conversation._id}`);
  });

  return (
    <>
      <PageHeader title="Ride share" subtitle="Share a ride to campus and split the fare. Seats can't be overbooked.">
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : 'Offer a ride'}
        </button>
      </PageHeader>

      {showForm && (
        <section className="card">
          <h2>Offer a ride</h2>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              create.run(e.currentTarget);
            }}
          >
            <Field label="From"><input name="from" required maxLength={100} placeholder="Mirpur 10" /></Field>
            <Field label="To"><input name="to" required maxLength={100} placeholder="Campus" /></Field>
            <Field label="Leaving at"><input name="departAt" type="datetime-local" required defaultValue={localDateTimeInput(2)} /></Field>
            <Field label="Vehicle">
              <select name="vehicle" defaultValue="Car">{VEHICLES.map((v) => <option key={v}>{v}</option>)}</select>
            </Field>
            <Field label="Seats for others"><input name="seats" type="number" min="1" max="6" defaultValue="3" required /></Field>
            <Field label="Total fare (৳)" hint="Split evenly between you and everyone who joins"><input name="totalFare" type="number" min="0" defaultValue="300" required /></Field>
            <Field label="Notes"><input name="notes" maxLength={300} placeholder="Pickup at the gate, AC car…" /></Field>
            <div className="form-actions"><button className="btn btn-primary" disabled={create.busy}>Post ride</button></div>
          </form>
          <ErrorNote error={create.error} />
        </section>
      )}

      <form className="filters" onSubmit={(e) => e.preventDefault()}>
        <input placeholder="From" aria-label="Filter by pickup" onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
        <input placeholder="To" aria-label="Filter by destination" onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
        <label className="check">
          <input type="checkbox" onChange={(e) => setFilters((f) => ({ ...f, mine: e.target.checked }))} /> Only my rides
        </label>
      </form>

      <ErrorNote error={error || act.error || message.error} />
      {loading && !data ? <Loading /> : !data?.rides.length ? (
        <Empty>No rides found. Offer one and save some money.</Empty>
      ) : (
        <div className="grid grid-2">
          {data.rides.map((r) => {
            const isHost = r.host?._id === user._id;
            const joined = r.passengers.some((p) => p._id === user._id);
            const cancelled = r.status === 'cancelled';
            const departed = new Date(r.departAt) < new Date();
            const nextFare = Math.ceil(r.totalFare / (r.passengers.length + 2));
            return (
              <article key={r._id} className={`card ride ${cancelled ? 'ride-cancelled' : ''}`}>
                <div className="ride-route">
                  <strong>{r.from}</strong> <span aria-hidden="true">→</span> <strong>{r.to}</strong>
                </div>
                <p className="muted small">
                  {formatDateTime(r.departAt)} · {r.vehicle} · hosted by {isHost ? 'you' : r.host?.name}
                </p>
                <div className="ride-stats">
                  <span className="pill">{cancelled ? 'Cancelled' : `${r.seatsLeft} of ${r.seats} seats left`}</span>
                  <span>৳{r.farePerPerson} each now{r.seatsLeft > 0 && !joined && !isHost && ` · ৳${nextFare} if you join`}</span>
                </div>
                {r.passengers.length > 0 && (
                  <p className="small">Riders: {r.passengers.map((p) => (p._id === user._id ? 'you' : p.name)).join(', ')}</p>
                )}
                {r.notes && <p className="muted small">{r.notes}</p>}
                {!cancelled && !departed && (
                  <div className="row">
                    {isHost ? (
                      <button type="button" className="btn btn-ghost btn-small" onClick={() => act.run(r._id, 'cancel')}>Cancel ride</button>
                    ) : joined ? (
                      <button type="button" className="btn btn-ghost btn-small" onClick={() => act.run(r._id, 'leave')}>Leave ride</button>
                    ) : (
                      <button type="button" className="btn btn-primary btn-small" disabled={r.seatsLeft === 0 || act.busy} onClick={() => act.run(r._id, 'join')}>
                        {r.seatsLeft === 0 ? 'Full' : 'Join ride'}
                      </button>
                    )}
                    {!isHost && <button type="button" className="btn btn-small" onClick={() => message.run(r)}>Message host</button>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
