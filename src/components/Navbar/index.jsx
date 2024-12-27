import Login from "../Login";

export default function Navbar() {
  const NavStyle = {
    backgroundColor: "#F4EAE0",
  };
  return (
    <div class="navbar bg-base-100 shadow-md">
    <div class="flex-1">
      <a class="btn btn-ghost normal-case text-xl">MyApp</a>
    </div>
    <div class="flex-none">
      <Login/>
    </div>
  </div>
  );
}
