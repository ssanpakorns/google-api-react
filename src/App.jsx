import { useState, useEffect } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import Main from "./components/Main";
import Login from "./components/Login";
import { AuthProvider } from './AuthContext';

function App() {
  const [dataProfile, setDataProfile] = useState("");

  
  return (
    <AuthProvider>
      <Navbar />
      <div className="container mx-auto">
        <Main />
      </div>
    </AuthProvider>
  );
}

export default App;
