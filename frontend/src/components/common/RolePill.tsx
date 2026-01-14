import './rolePill.css';

type Props = {
  role: string;
};

const RolePill = ({ role }: Props) => (
  <span className="role-pill">
    {role}
  </span>
);

export default RolePill;
