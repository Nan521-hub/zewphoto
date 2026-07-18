import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import Classify from "@/pages/Classify";
import Pair from "@/pages/Pair";
import ProcessPage from "@/pages/Process";
import Sidebar from "@/components/Sidebar";

export default function App() {
  return (
    <Router>
      <div className="flex h-full min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/classify" element={<Classify />} />
            <Route path="/pair" element={<Pair />} />
            <Route path="/process" element={<ProcessPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
