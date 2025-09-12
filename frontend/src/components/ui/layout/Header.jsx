// src/components/ui/layout/Header.jsx

import { useAuth } from "../../../context/AuthContext";

const Header = () => {
  const { authUser } = useAuth();

  return (
    <header className="bg-white border-b p-4 shadow-sm flex justify-between items-center">
      <h1 className="text-xl font-bold">PMInsight</h1>
      <div>{authUser?.username || "Usuario"}</div>
    </header>
  );
};

export default Header;