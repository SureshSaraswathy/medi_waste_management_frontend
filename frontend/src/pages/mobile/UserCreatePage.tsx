import { FormEvent, useState } from 'react';
import FormCard from '../../components/common/FormCard';
import InputField from '../../components/common/InputField';
import PrimaryButton from '../../components/common/PrimaryButton';
import RolePill from '../../components/common/RolePill';
import { useAuth } from '../../hooks/useAuth';
import '../../components/common/formCard.css';
import '../../components/common/inputField.css';
import '../../components/common/primaryButton.css';
import '../../components/common/rolePill.css';
import '../../styles/global.css';
import '../../styles/forms.css';

type RoleOption = 'manager' | 'staff' | 'viewer';

const roleCopy: Record<RoleOption, string> = {
  manager: 'Approve & oversee routes',
  staff: 'Execute pickups',
  viewer: 'Read-only visibility',
};

const UserCreatePageMobile = () => {
  const { createUser, loading, user } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff' as RoleOption,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const created = await createUser(form);
      setMessage(`Created ${created.name} (${created.roles.join(', ')})`);
      setForm({ ...form, name: '', email: '', password: '' });
    } catch (err) {
      setError((err as Error).message || 'Unable to create user');
    }
  };

  return (
    <FormCard
      title="Add Field User"
      subtitle="Mobile-first creation for operational leads."
      action={user ? <RolePill role={user.roles[0]} /> : null}
    >
      <form className="form-grid mobile" onSubmit={onSubmit}>
        <InputField
          label="Name"
          placeholder="Jordan Blake"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <InputField
          label="Email"
          type="email"
          placeholder="user@medi-waste.io"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <InputField
          label="Password"
          type="password"
          placeholder="Strong password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          hint="Min 8 characters"
        />
        <label className="input-field">
          <span>Role</span>
          <div className="role-options">
            {(Object.keys(roleCopy) as RoleOption[]).map((role) => (
              <button
                key={role}
                type="button"
                className={`role-chip ${form.role === role ? 'role-chip--active' : ''}`}
                onClick={() => setForm((f) => ({ ...f, role }))}
              >
                <strong>{role}</strong>
                <small>{roleCopy[role]}</small>
              </button>
            ))}
          </div>
        </label>
        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-success">{message}</div>}
        <PrimaryButton type="submit" loading={loading}>
          Save User
        </PrimaryButton>
        <p className="muted">Managers can add staff on the go.</p>
      </form>
    </FormCard>
  );
};

export default UserCreatePageMobile;
