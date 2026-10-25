import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { formatDateTime, useLoad, useSubmit } from '../hooks';
import { Empty, ErrorNote, Loading, PageHeader } from '../ui';

const POLL_MS = 4000;

function Thread({ id, onActivity }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const lastRef = useRef(null);

  useEffect(() => {
    let stopped = false;
    lastRef.current = null;
    setMessages([]);
    async function poll() {
      try {
        const after = lastRef.current ? `?after=${encodeURIComponent(lastRef.current)}` : '';
        const res = await api.get(`/chat/${id}/messages${after}`);
        if (stopped || !res.messages.length) return;
        lastRef.current = res.messages[res.messages.length - 1].createdAt;
        setMessages((m) => {
          const seen = new Set(m.map((x) => x._id));
          return [...m, ...res.messages.filter((x) => !seen.has(x._id))];
        });
        onActivity();
      } catch (err) {
        if (!stopped) setError(err);
      }
    }
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [id, onActivity]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = useSubmit(async () => {
    const body = text.trim();
    if (!body) return;
    const res = await api.post(`/chat/${id}/messages`, { text: body });
    setText('');
    lastRef.current = res.message.createdAt;
    setMessages((m) => [...m, res.message]);
    onActivity();
  });

  return (
    <div className="thread">
      <div className="thread-messages" aria-live="polite">
        {messages.length === 0 ? <Empty>No messages yet. Say hi 👋</Empty> : messages.map((m) => (
          <div key={m._id} className={`bubble ${m.sender === user._id ? 'bubble-mine' : ''}`}>
            <p>{m.text}</p>
            <span className="bubble-time">{formatDateTime(m.createdAt)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <ErrorNote error={error || send.error} />
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send.run();
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" aria-label="Message" maxLength={2000} />
        <button className="btn btn-primary" disabled={send.busy || !text.trim()}>Send</button>
      </form>
    </div>
  );
}

export default function Messages() {
  const { id } = useParams();
  const { data, error, loading, reload } = useLoad(() => api.get('/chat'));
  const conversations = data?.conversations || [];
  const active = conversations.find((c) => c._id === id);

  return (
    <>
      <PageHeader title="Messages" subtitle="Chat with tutors, classmates and ride hosts." />
      <ErrorNote error={error} />
      <div className={`inbox ${id ? 'inbox-open' : ''}`}>
        <aside className="inbox-list card">
          {loading && !data ? <Loading /> : conversations.length === 0 ? (
            <Empty>No conversations yet. Start one from Study help or Ride share.</Empty>
          ) : (
            <ul>
              {conversations.map((c) => (
                <li key={c._id}>
                  <Link to={`/messages/${c._id}`} className={`inbox-item ${c._id === id ? 'inbox-item-active' : ''}`}>
                    <strong>{c.other?.name || 'Student'}</strong> {c.unread && <span className="dot" aria-label="unread" />}
                    {c.topic && <span className="muted small block">{c.topic}</span>}
                    <span className="muted small block truncate">{c.lastMessage || 'No messages yet'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section className="inbox-thread card">
          {id ? (
            <>
              <div className="card-head">
                <Link to="/messages" className="inbox-back">←</Link>
                <h2>{active?.other?.name || 'Conversation'}</h2>
                {active?.topic && <span className="muted small">{active.topic}</span>}
              </div>
              <Thread id={id} onActivity={reload} />
            </>
          ) : (
            <Empty>Pick a conversation.</Empty>
          )}
        </section>
      </div>
    </>
  );
}
