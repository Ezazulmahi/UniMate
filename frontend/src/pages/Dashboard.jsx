import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { formatDateTime, relativeTime, useLoad } from '../hooks';
import { Empty, ErrorNote, Loading, PageHeader } from '../ui';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, loading } = useLoad(async () => {
    const [routine, grades, exams, rides, chats] = await Promise.all([
      api.get('/routine'),
      api.get('/academic/grades'),
      api.get('/academic/exams?upcoming=true'),
      api.get('/rides?mine=true'),
      api.get('/chat'),
    ]);
    return { routine, grades, exams, rides, chats };
  });

  const today = DAY_NAMES[new Date().getDay()];
  const todaysClasses = data?.routine.entries.filter((e) => e.day === today) || [];
  const upcomingRides = data?.rides.rides.filter((r) => r.status === 'open' && new Date(r.departAt) > new Date()) || [];
  const unread = data?.chats.conversations.filter((c) => c.unread).length || 0;

  return (
    <>
      <PageHeader title={`Hi, ${user.name.split(' ')[0]} 👋`} subtitle="Here is what's coming up." />
      <ErrorNote error={error} />
      {loading && !data ? (
        <Loading />
      ) : (
        data && (
          <div className="grid grid-2">
            <section className="card">
              <div className="card-head">
                <h2>Today's classes ({today})</h2>
                <Link to="/routine">Routine →</Link>
              </div>
              {todaysClasses.length ? (
                <ul className="list">
                  {todaysClasses.map((c) => (
                    <li key={c._id}>
                      <strong>{c.start}–{c.end}</strong> {c.courseCode} {c.kind !== 'Class' && `(${c.kind})`}
                      {c.room && <span className="muted"> · {c.room}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No classes today.</Empty>
              )}
            </section>

            <section className="card">
              <div className="card-head">
                <h2>Upcoming exams</h2>
                <Link to="/grades">CGPA & exams →</Link>
              </div>
              {data.exams.exams.length ? (
                <ul className="list">
                  {data.exams.exams.slice(0, 4).map((x) => (
                    <li key={x._id}>
                      <strong>{x.courseCode}</strong> {x.title}{' '}
                      <span className="pill">{relativeTime(x.date)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No exams added yet.</Empty>
              )}
            </section>

            <section className="card stat-card">
              <div className="card-head">
                <h2>CGPA</h2>
                <Link to="/grades">Details →</Link>
              </div>
              <p className="stat">{data.grades.cgpa ?? '—'}</p>
              <p className="muted">{data.grades.totalCredits} credits completed</p>
            </section>

            <section className="card">
              <div className="card-head">
                <h2>Your rides</h2>
                <Link to="/rides">Ride share →</Link>
              </div>
              {upcomingRides.length ? (
                <ul className="list">
                  {upcomingRides.slice(0, 3).map((r) => (
                    <li key={r._id}>
                      {r.from} → {r.to} <span className="muted">· {formatDateTime(r.departAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No rides booked.</Empty>
              )}
              {unread > 0 && (
                <p>
                  <Link to="/messages">💬 {unread} unread conversation{unread > 1 ? 's' : ''}</Link>
                </p>
              )}
            </section>
          </div>
        )
      )}
    </>
  );
}
