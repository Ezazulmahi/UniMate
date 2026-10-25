import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { formValues, useSubmit } from '../hooks';
import { ErrorNote, Field, PageHeader } from '../ui';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [saved, setSaved] = useState(false);
  const save = useSubmit(async (form) => {
    const res = await api.patch('/auth/me', formValues(form));
    setUser(res.user);
    setSaved(true);
  });

  return (
    <>
      <PageHeader title="Your profile" subtitle={user.email} />
      <section className="card">
        <form
          className="form-grid"
          onChange={() => setSaved(false)}
          onSubmit={(e) => {
            e.preventDefault();
            save.run(e.currentTarget);
          }}
        >
          <Field label="Name"><input name="name" required maxLength={80} defaultValue={user.name} /></Field>
          <Field label="Department"><input name="department" maxLength={80} defaultValue={user.department} /></Field>
          <Field label="Bio"><textarea name="bio" rows={3} maxLength={500} defaultValue={user.bio} /></Field>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={save.busy}>Save</button>
            {saved && <span className="muted" role="status">Saved ✓</span>}
          </div>
        </form>
        <ErrorNote error={save.error} />
      </section>
    </>
  );
}
